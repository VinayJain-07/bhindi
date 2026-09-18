import { redirect } from "next/navigation";
import { AuthPage } from "@/components/auth-page";
import { currentUser } from "@/lib/auth-helpers";

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect("/");
  return <AuthPage mode="login" />;
}
