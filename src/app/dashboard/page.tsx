import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.role) {
    redirect("/sign-in");
  }

  switch (session.user.role) {
    case "ADMIN":
      redirect("/dashboard/admin");

    case "MANAGER":
      redirect("/dashboard/manager");

    case "EMPLOYEE":
      redirect("/dashboard/employee");

    default:
      redirect("/sign-in");
  }
}