"""Minimal stdio JSON-RPC client for blazickjp/arxiv-mcp-server.

WHY THIS EXISTS
---------------
Hermes's MCP layer starts the `arxiv` server but the transport write blocks
(`courtesy cancel for caller-cancelled request ... transport write blocked` in
logs/mcp-stderr.log), so `tool_search` never sees the 19 arxiv tools. The
server itself is healthy -- a plain subprocess handshake returns
`serverInfo {name: arxiv-mcp-server, version: 0.8.2}` and a full tools/list.

This bridge talks to the same server the config points at
(`uvx arxiv-mcp-server`) without going through Hermes's MCP client, so the
corpus pipeline can use search/download/read/citation tools today instead of
waiting on the transport bug.

USAGE
-----
    from arxiv_bridge import ArxivBridge
    with ArxivBridge() as ax:
        hits = ax.search("coverage disguise", max_results=5)
        text = ax.download("2401.12345", max_chars=4000)

Every call returns parsed JSON; errors raise ArxivError with the server's own
message rather than a bare timeout.
"""

from __future__ import annotations

import json
import subprocess
import threading
import time
from typing import Any

DEFAULT_CMD = ["uvx", "arxiv-mcp-server"]
START_TIMEOUT = 60.0
CALL_TIMEOUT = 180.0


class ArxivError(RuntimeError):
    """Raised when the arxiv MCP server returns a JSON-RPC error or times out."""


class ArxivBridge:
    """Context-managed stdio client for arxiv-mcp-server.

    Not thread-safe by design: one reader thread owns stdout for the whole
    session, and calls are serialized. That keeps the framing correct, which
    is the thing that actually breaks when you try to parallelize a stdio
    JSON-RPC stream.
    """

    def __init__(self, cmd: list[str] | None = None, stderr_path: str | None = None):
        self.cmd = cmd or DEFAULT_CMD
        self._proc: subprocess.Popen | None = None
        self._next_id = 0
        self._lock = threading.Lock()
        self._stderr_path = stderr_path
        self._stderr_buf: list[str] = []

    # -- lifecycle ---------------------------------------------------------

    def __enter__(self) -> "ArxivBridge":
        self.start()
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    def start(self) -> None:
        if self._proc is not None:
            return
        self._proc = subprocess.Popen(
            self.cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        # Drain stderr so a chatty server cannot fill the pipe buffer and
        # deadlock the stdout read. This is the single most common cause of
        # "transport write blocked" on stdio MCP servers.
        t = threading.Thread(target=self._drain_stderr, daemon=True)
        t.start()
        self._request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "gse-arxiv-bridge", "version": "0.1"},
        }, timeout=START_TIMEOUT)
        self._notify("notifications/initialized")

    def close(self) -> None:
        p, self._proc = self._proc, None
        if p is None:
            return
        try:
            p.stdin.close()
        except Exception:
            pass
        try:
            p.wait(timeout=5)
        except Exception:
            p.terminate()
            try:
                p.wait(timeout=5)
            except Exception:
                p.kill()

    def _drain_stderr(self) -> None:
        assert self._proc is not None
        for line in self._proc.stderr:  # type: ignore[union-attr]
            self._stderr_buf.append(line.rstrip())
            if len(self._stderr_buf) > 200:
                del self._stderr_buf[:100]

    # -- JSON-RPC plumbing -------------------------------------------------

    def _write(self, obj: dict) -> None:
        assert self._proc is not None and self._proc.stdin is not None
        self._proc.stdin.write(json.dumps(obj) + "\n")
        self._proc.stdin.flush()

    def _notify(self, method: str, params: dict | None = None) -> None:
        msg: dict[str, Any] = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            msg["params"] = params
        self._write(msg)

    def _request(self, method: str, params: dict | None = None,
                 timeout: float = CALL_TIMEOUT) -> dict:
        """Send a request and wait for the matching id. Skips notifications."""
        with self._lock:
            self._next_id += 1
            rid = self._next_id
            msg: dict[str, Any] = {"jsonrpc": "2.0", "id": rid, "method": method}
            if params is not None:
                msg["params"] = params
            self._write(msg)
            return self._read_until(rid, timeout)

    def _read_until(self, rid: int, timeout: float) -> dict:
        """Read lines until the response with our id arrives.

        Servers interleave notifications and log lines on stdout; those are
        skipped rather than treated as the answer.
        """
        assert self._proc is not None and self._proc.stdout is not None
        deadline = time.time() + timeout
        while time.time() < deadline:
            remaining = max(1.0, deadline - time.time())
            line = _readline_timeout(self._proc.stdout, remaining)
            if line is None:
                raise ArxivError(
                    f"arxiv server produced no response for id={rid} within "
                    f"{timeout}s. stderr tail: {self.stderr_tail()}"
                )
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                # Not JSON-RPC (server log noise) -- skip it.
                continue
            if obj.get("id") != rid:
                continue
            if "error" in obj:
                err = obj["error"]
                raise ArxivError(f"{method_name(err)}: {err}")
            return obj.get("result") or {}
        raise ArxivError(f"timed out waiting for id={rid}; stderr: {self.stderr_tail()}")

    def stderr_tail(self, n: int = 8) -> str:
        return " | ".join(self._stderr_buf[-n:])

    # -- tools -------------------------------------------------------------

    def list_tools(self) -> list[dict]:
        return self._request("tools/list", {}).get("tools", [])

    def call(self, tool: str, **kwargs: Any) -> Any:
        """Invoke one MCP tool and return its parsed payload."""
        result = self._request("tools/call", {"name": tool, "arguments": kwargs})
        return _unwrap(result)

    # Thin wrappers over the tools we actually use. Each one exists so callers
    # do not have to remember the exact tool name and argument spelling.

    def search(self, query: str, max_results: int = 10, **kw: Any) -> Any:
        return self.call("search_papers", query=query, max_results=max_results, **kw)

    def abstract(self, paper_id: str) -> Any:
        return self.call("get_abstract", paper_id=paper_id)

    def download(self, paper_id: str, max_chars: int = 20000,
                 return_full_text: bool = True, force: bool = False) -> Any:
        return self.call("download_paper", paper_id=paper_id, max_chars=max_chars,
                         return_full_text=return_full_text, force=force)

    def read(self, paper_id: str, max_chars: int = 20000,
             return_full_text: bool = True) -> Any:
        return self.call("read_paper", paper_id=paper_id, max_chars=max_chars,
                         return_full_text=return_full_text)

    def citations(self, paper_id: str, max_citations: int = 20) -> Any:
        return self.call("citation_graph", paper_id=paper_id,
                         max_citations=max_citations)

    def list_downloaded(self, compact: bool = True) -> Any:
        return self.call("list_papers", compact=compact)


def method_name(err: Any) -> str:
    if isinstance(err, dict):
        return str(err.get("message") or err.get("code") or "arxiv error")
    return "arxiv error"


def _unwrap(result: dict) -> Any:
    """MCP tools return {content:[{type:text,text:'...'}]}. Decode when possible."""
    if not isinstance(result, dict):
        return result
    content = result.get("content")
    if isinstance(content, list) and content:
        texts = [c.get("text", "") for c in content
                 if isinstance(c, dict) and c.get("type") == "text"]
        if len(texts) == 1:
            try:
                return json.loads(texts[0])
            except (json.JSONDecodeError, TypeError):
                return texts[0]
        if texts:
            return "\n".join(texts)
    return result


def _readline_timeout(stream: Any, timeout: float) -> str | None:
    """Read one line with a timeout; stdio readline has no native timeout."""
    box: dict[str, str | None] = {}

    def rd() -> None:
        box["line"] = stream.readline()

    t = threading.Thread(target=rd, daemon=True)
    t.start()
    t.join(timeout)
    if t.is_alive():
        return None
    return box.get("line")


if __name__ == "__main__":
    import sys

    with ArxivBridge() as ax:
        tools = ax.list_tools()
        print(f"{len(tools)} tools available")
        for t in tools:
            print(f"  - {t['name']}")
        if len(sys.argv) > 1:
            q = " ".join(sys.argv[1:])
            print(f"\nsearch: {q}")
            print(json.dumps(ax.search(q, max_results=3), indent=2)[:2000])
