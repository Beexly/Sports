# Amplify Architecture Sketch

Local-only sketch:

```text
GitHub branch -> Amplify build -> SSR hosting -> CloudWatch logs
```

Blocked until owner approval:
- GitHub provider connection.
- Amplify app creation.
- Branch connection.
- Domain connection.
- Service role creation.
- Secrets or env var sync.

Data note:
- Hosting the app does not grant rights to store or display additional source data.
