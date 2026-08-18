import { isAuthDisabled } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/services/auth/session";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  const conversations = await prisma.conversation.findMany({
    where: { companyId: user.companyId, userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: { id: true, title: true },
  });

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
