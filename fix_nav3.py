import re

file_path = "apps/web/components/ui/nav.tsx"
with open(file_path, "r") as f:
    content = f.read()

bad_block1 = """export function Nav() {
  return (
    <NavChrome
      right={
        <Suspense fallback={<NavAuthFallback />}>
          <NavAuth />
        </Suspense>
      }
    />
  );
}"""

bad_block2 = """export function NavSkeleton() {
  return <NavChrome right={<NavAuthFallback />} />;
}"""

content = content.replace(bad_block1, "")
content = content.replace(bad_block2, "")

with open(file_path, "w") as f:
    f.write(content)
