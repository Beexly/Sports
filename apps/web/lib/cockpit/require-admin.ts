import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireCockpitAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/cockpit");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }
}
