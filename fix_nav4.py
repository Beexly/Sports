import re

file_path = "apps/web/components/ui/nav.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace('import { Suspense } from "react";\n', '')
content = content.replace('import { NavAuth, NavAuthFallback } from "@/components/ui/nav-auth";\n', 'import { NavAuthFallback } from "@/components/ui/nav-auth";\n')

with open(file_path, "w") as f:
    f.write(content)
