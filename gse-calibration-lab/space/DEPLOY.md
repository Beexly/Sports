# Deploying the lab to a host

The app is fail-closed by construction: `gsecal/serve.py` refuses to bind
anywhere but loopback without `GSECAL_AUTH_USER` + `GSECAL_AUTH_PASS`, and
never enables Gradio's public tunnel in any configuration. You cannot
accidentally publish unpublished calibration numbers by mis-typing a flag.

What that policy does **not** do is make a host private. That part is yours.

## Hugging Face Spaces

1. **Create the Space as PRIVATE.** SDK: Gradio.
   Auth password-gates the page; Space visibility controls who can see the repo,
   the logs, and the build. Both are needed. This is the step people skip.

2. **Add the credentials as Space _secrets_, not variables.**
   Settings → Variables and secrets → *New secret*:
   `GSECAL_AUTH_USER`, `GSECAL_AUTH_PASS`.
   Variables are visible in the Space UI; secrets are not. Never commit either.

3. **Push the lab directory as the Space repo root**, with this folder's
   `README.md` (it carries the required YAML frontmatter) and `requirements.txt`
   at the top level:

   ```bash
   git clone https://huggingface.co/spaces/<org>/<space> /tmp/space && cd /tmp/space
   cp -r <repo>/gse-calibration-lab/{app.py,gsecal} .
   cp <repo>/gse-calibration-lab/space/README.md .
   cp <repo>/gse-calibration-lab/space/requirements.txt .
   git add -A && git commit -m "deploy calibration lab" && git push
   ```

   `parity/`, `tests/` and `FINDINGS.md` are intentionally **not** copied:
   `FINDINGS.md` contains unpublished figures and nothing on the Space needs it.

4. **Verify the refusal actually fires** before trusting the deploy. Temporarily
   remove one secret and confirm the Space fails to start with
   `PublicWithoutAuthError`. A safety net nobody has seen fire is a guess.

## Container hosts (Kubernetes / LKE, Cloud Run, a GPU box)

Same contract. `serve.py` detects `KUBERNETES_SERVICE_HOST`, `K_SERVICE`,
`SPACE_ID` and `SPACE_HOST` and treats the process as public **even if it was
asked to bind loopback**, because being wrong in that direction publishes.

Supply the two env vars from your secret store, put it behind whatever ingress
auth you already run, and keep it off any public route. There is no GPU work
here — the whole core is stdlib arithmetic and runs fine on the smallest node
available. Do not provision an accelerator for it.

## The honest recommendation

Prefer `python3 -m gsecal` locally. It needs no install, no host, no secret and
no network, and there is then no attack surface to reason about at all. Deploy
only when more than one person genuinely needs the cockpit.
