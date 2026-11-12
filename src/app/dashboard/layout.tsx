import { AppShell } from "@/components/app/app-shell";
import { getBalance } from "@/lib/coins";
import { requireUser } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser();
  const balance = await getBalance(user.id);
  return (
    <AppShell user={{ name: user.name, email: user.email, image: user.image }} balance={balance}>
      {children}
    </AppShell>
  );
}
