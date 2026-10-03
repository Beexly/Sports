import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardView } from "./dashboard-view";

export const metadata = { title: "Operator Dashboard — Internal" };

export default async function OperatorDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }
  return <DashboardView />;
}
