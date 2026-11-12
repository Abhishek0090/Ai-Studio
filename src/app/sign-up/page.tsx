import { AuthPage } from "@/components/auth/auth-page";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return <AuthPage mode="sign-up" />;
}
