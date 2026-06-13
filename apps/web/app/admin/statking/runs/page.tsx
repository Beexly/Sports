import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
return <main><h1>Runs</h1><p>StatKing rights-gated intelligence foundation route.</p></main>}
