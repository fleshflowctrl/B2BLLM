import { isAuthDisabled } from "@/lib/env";
import { listConversations } from "@/lib/db";
import { requireUserPage } from "@/services/auth/session";
import { AppSidebar } from "@/components/app-sidebar";
import { SetupRequired } from "@/components/setup-required";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user;
  let conversations;
  try {
    user = await requireUserPage();
    conversations = await listConversations(user.companyId, user.id);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return <SetupRequired detail={detail} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <AppSidebar
        companyName={user.companyName}
        userName={user.name}
        role={user.role}
        conversations={conversations}
        hideSignOut={isAuthDisabled()}
      />
      <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
