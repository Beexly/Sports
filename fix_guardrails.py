import re
file_path = "apps/web/__tests__/guardrails.test.ts"
with open(file_path, "r") as f:
    content = f.read()

content = re.sub(r'  function guardrailsChain\(\): string \{\n.*?return script;\n  \}', '', content, flags=re.DOTALL)
with open(file_path, "w") as f:
    f.write(content)
