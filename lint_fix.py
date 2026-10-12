import re

file_path = "apps/web/components/ui/nav.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Oh wait, someone messed up nav.tsx and pasted the functions twice? Look at the `Nav()` function output above.
