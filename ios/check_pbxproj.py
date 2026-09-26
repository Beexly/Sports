#!/usr/bin/env python3
"""
Validates ios/GalaxySportsEdge.xcodeproj/project.pbxproj without Xcode.

WHY THIS EXISTS
---------------
A pbxproj is an OpenStep property list. `plutil` will not lint one (it applies
the XML grammar to the content whatever the file is called), and the only
other way to find out whether the project opens is to run xcodebuild on a
macOS runner and read "The project is damaged and cannot be opened due to a
parse error" with no line number. That is a 35-minute round trip per
guess, and this file is generated, so a structural mistake is a bug in the
generator that will be reproduced on every run.

So the parse is done here, in the cheap ubuntu job, in a few seconds, and it
reports a line and column.

WHAT IT CHECKS
--------------
1. The file parses as an OpenStep property list (a real parse, not a brace
   count -- the file that Xcode once refused to open had balanced braces).
2. Duplicate keys. A repeated object id makes the `objects` table ambiguous,
   and Xcode's own OpenStep-to-JSON conversion is where that shows up as
   "JSON text did not start with array or object".
3. Every id referenced anywhere in the file is defined in `objects`. A
   dangling reference is a project that opens and then fails to build.
4. `rootObject` names a real PBXProject, and the scheme's target ids exist.

Exit 0 means the structure is sound. Anything else exits 1 and says where.
"""

import os
import re
import sys

HEX24 = re.compile(r"^[0-9A-F]{24}$")


class ParseError(Exception):
    def __init__(self, message, line, col):
        super().__init__(f"{message} (line {line}, column {col})")
        self.line = line
        self.col = col


class Parser:
    """A strict reader for the OpenStep subset a pbxproj actually uses.

    Deliberately not a general property-list implementation: it accepts
    dictionaries, arrays, quoted and bare strings, `//` and slash-star
    comments, and nothing else. Anything a pbxproj does not need is an error
    rather than a silent pass, because this file's job is to say no.
    """

    BARE = set("abcdefghijklmnopqrstuvwxyz"
               "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
               "0123456789_$+/:.-")

    def __init__(self, text):
        self.text = text
        self.pos = 0
        self.line = 1
        self.col = 1
        self.duplicates = []

    # -- position bookkeeping ------------------------------------------------
    def peek(self, offset=0):
        i = self.pos + offset
        return self.text[i] if i < len(self.text) else ""

    def advance(self):
        ch = self.text[self.pos]
        self.pos += 1
        if ch == "\n":
            self.line += 1
            self.col = 1
        else:
            self.col += 1
        return ch

    def fail(self, message):
        raise ParseError(message, self.line, self.col)

    def skip(self):
        while self.pos < len(self.text):
            ch = self.peek()
            if ch in " \t\r\n":
                self.advance()
            elif self.text.startswith("//", self.pos):
                while self.pos < len(self.text) and self.peek() != "\n":
                    self.advance()
            elif self.text.startswith("/*", self.pos):
                start_line, start_col = self.line, self.col
                self.advance()
                self.advance()
                while self.pos < len(self.text) and not self.text.startswith("*/", self.pos):
                    self.advance()
                if self.pos >= len(self.text):
                    self.line, self.col = start_line, start_col
                    self.fail("unterminated comment")
                self.advance()
                self.advance()
            else:
                return

    # -- values --------------------------------------------------------------
    def parse_value(self):
        self.skip()
        ch = self.peek()
        if ch == "":
            self.fail("unexpected end of file")
        if ch == "{":
            return self.parse_dict()
        if ch == "(":
            return self.parse_array()
        if ch == '"':
            return self.parse_quoted()
        if ch == "<":
            return self.parse_data()
        if ch in self.BARE:
            return self.parse_bare()
        self.fail(f"unexpected character {ch!r}")

    def parse_dict(self):
        self.advance()  # {
        out = {}
        while True:
            self.skip()
            ch = self.peek()
            if ch == "":
                self.fail("unterminated dictionary")
            if ch == "}":
                self.advance()
                return out
            key = self.parse_value()
            self.skip()
            if self.peek() != "=":
                self.fail(f"expected '=' after key {key!r}")
            self.advance()
            value = self.parse_value()
            self.skip()
            if self.peek() == ";":
                self.advance()
            if key in out:
                # Kept rather than raised: the caller decides whether a
                # duplicate id is fatal. A duplicate string key elsewhere is
                # a generator bug this should surface either way.
                self.duplicates.append((key, self.line))
            out[key] = value

    def parse_array(self):
        self.advance()  # (
        out = []
        while True:
            self.skip()
            ch = self.peek()
            if ch == "":
                self.fail("unterminated array")
            if ch == ")":
                self.advance()
                return out
            out.append(self.parse_value())
            self.skip()
            if self.peek() == ",":
                self.advance()

    def parse_quoted(self):
        self.advance()  # "
        chunks = []
        while True:
            ch = self.peek()
            if ch == "":
                self.fail("unterminated string")
            if ch == '"':
                self.advance()
                return "".join(chunks)
            if ch == "\\":
                self.advance()
                chunks.append(self.advance())
                continue
            chunks.append(self.advance())

    def parse_data(self):
        self.advance()  # <
        while self.peek() != ">" and self.peek() != "":
            self.advance()
        if self.peek() == "":
            self.fail("unterminated data")
        self.advance()
        return "<data>"

    def parse_bare(self):
        chunks = []
        while self.peek() in self.BARE and self.peek() != "":
            chunks.append(self.advance())
        return "".join(chunks)

    def parse(self):
        value = self.parse_value()
        self.skip()
        if self.pos < len(self.text):
            self.fail("trailing content after the root value")
        return value


# ── structural checks ────────────────────────────────────────────────────────

def collect_references(value, found, path="root"):
    """Every 24-hex id appearing anywhere in the tree."""
    if isinstance(value, dict):
        for key, sub in value.items():
            collect_references(sub, found, f"{path}.{key}")
    elif isinstance(value, list):
        for i, sub in enumerate(value):
            collect_references(sub, found, f"{path}[{i}]")
    elif isinstance(value, str) and HEX24.match(value):
        found.setdefault(value, []).append(path)


def check_pbxproj(path):
    problems = []
    with open(path, "r", encoding="utf-8") as handle:
        text = handle.read()

    parser = Parser(text)
    try:
        root = parser.parse()
    except ParseError as exc:
        return [f"{os.path.basename(path)}: {exc}"]

    for key, line in parser.duplicates:
        problems.append(f"{os.path.basename(path)}: duplicate key {key!r} at line {line}")

    if not isinstance(root, dict):
        return [f"{os.path.basename(path)}: root is {type(root).__name__}, expected a dictionary"]

    for required in ("archiveVersion", "objectVersion", "objects", "rootObject"):
        if required not in root:
            problems.append(f"{os.path.basename(path)}: missing {required}")

    objects = root.get("objects")
    if not isinstance(objects, dict):
        problems.append(f"{os.path.basename(path)}: 'objects' is not a dictionary")
        return problems

    # Every object should declare what it is. This is the check that catches a
    # generator writing a section with the wrong isa, which otherwise surfaces
    # as a project that opens and then silently builds the wrong file list.
    for oid, obj in objects.items():
        if not isinstance(obj, dict) or "isa" not in obj:
            problems.append(f"{os.path.basename(path)}: object {oid} has no isa")
        elif not HEX24.match(oid):
            problems.append(f"{os.path.basename(path)}: object key {oid!r} is not a 24-hex id")

    found = {}
    collect_references(objects, found, "objects")
    for oid, where in sorted(found.items()):
        if oid not in objects:
            sample = ", ".join(where[:3])
            problems.append(
                f"{os.path.basename(path)}: dangling reference {oid} "
                f"(first seen at {sample})")

    root_object = root.get("rootObject")
    if isinstance(root_object, str):
        if root_object not in objects:
            problems.append(f"{os.path.basename(path)}: rootObject {root_object} is not defined")
        elif objects[root_object].get("isa") != "PBXProject":
            problems.append(
                f"{os.path.basename(path)}: rootObject is "
                f"{objects[root_object].get('isa')}, expected PBXProject")

    return problems


def check_scheme(pbx_path, problems):
    """The shared scheme must point at targets that exist."""
    scheme_dir = os.path.join(os.path.dirname(pbx_path), "xcshareddata", "xcschemes")
    if not os.path.isdir(scheme_dir):
        return
    with open(pbx_path, "r", encoding="utf-8") as handle:
        root = Parser(handle.read()).parse()
    objects = root.get("objects", {})

    for name in sorted(os.listdir(scheme_dir)):
        if not name.endswith(".xcscheme"):
            continue
        with open(os.path.join(scheme_dir, name), "r", encoding="utf-8") as handle:
            body = handle.read()
        for ref in re.findall(r'BlueprintIdentifier = "([^"]+)"', body):
            if not HEX24.match(ref):
                continue
            target = objects.get(ref)
            if target is None:
                problems.append(f"{name}: BlueprintIdentifier {ref} is not a target in the project")
            elif target.get("isa") != "PBXNativeTarget":
                problems.append(
                    f"{name}: BlueprintIdentifier {ref} is a "
                    f"{target.get('isa')}, expected PBXNativeTarget")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    pbx = os.path.join(here, "GalaxySportsEdge.xcodeproj", "project.pbxproj")
    if not os.path.exists(pbx):
        print(f"missing {pbx}")
        return 1

    problems = check_pbxproj(pbx)
    if not problems:
        try:
            check_scheme(pbx, problems)
        except ParseError as exc:
            problems.append(f"project.pbxproj: {exc}")

    if problems:
        print("project.pbxproj is not structurally sound:")
        for problem in problems:
            print("  " + problem)
        return 1
    print("project.pbxproj parses; every object id is defined and unique")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
