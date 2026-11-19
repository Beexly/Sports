import { permanentRedirect } from "next/navigation";

export default function DfsRedirectPage(): never {
  permanentRedirect("/fantasy/dfs");
}
