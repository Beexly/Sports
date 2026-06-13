import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
return <main><h1>King Standard Score</h1><p>StatKing hardening foundation: source trust, coverage, freshness, conflicts, and proof.</p></main>}
