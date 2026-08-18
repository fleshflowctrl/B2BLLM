import { isAuthDisabled } from "@/lib/env";
import { listUserConversations } from "@/lib/repo";
import { requireUserPage } from "@/services/auth/session";
import { AppSidebar } from "@/components/app-sidebar";
import { SetupRequired } from "@/components/setup-required";

function isNextRedirect(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error ? String(error.digest) : "";
  const message = "message" in error ? String(error.message) : "";
  return digest.startsWith("NEXT_REDIRECT") || message === "NEXT_REDIRECT";
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user;
  let conversations;
  try {
    user = await requireUserPage();
    conversations = await listUserConversations(user.companyId, user.id);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return <SetupRequired detail={detail} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <AppSidebar
        companyName={user.companyName}
        userName={user.name}
        role={user.role}
        conversations={conversations.map((item) => ({ id: item.id, title: item.title }))}
        hideSignOut={isAuthDisabled()}
      />
      <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
