# Buyer curl paths

```bash
# Health
curl -s localhost:8080/health

# Consistency (minimal)
curl -s -X POST localhost:8080/v1/consistency \
  -H 'content-type: application/json' \
  -d '{"nodes":["a","b"],"edges":[{"source":"a","target":"b","theta":0}],"features":{"a":[1,0],"b":[1,0]}}'
```

See `api/openapi.yaml` for full schema.
