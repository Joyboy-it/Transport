import { logoutAction } from "@/app/login/actions";
import { AppShell } from "@/components/shell/app-shell";
import { ROLE_LABEL } from "@/domain/permissions";
import { loadMenuCounts } from "@/modules/counts";
import { requireUser } from "@/server/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const counts = await loadMenuCounts(user.role);
  return (
    <AppShell
      role={user.role}
      user={{ displayName: user.displayName, username: user.username, roleLabel: ROLE_LABEL[user.role] }}
      counts={counts}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}
