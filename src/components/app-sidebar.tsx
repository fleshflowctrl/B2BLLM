"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Conversation = { id: string; title: string };

export function AppSidebar({
  companyName,
  userName,
  role,
  conversations,
  hideSignOut = false,
}: {
  companyName: string;
  userName: string;
  role: "ADMIN" | "EMPLOYEE";
  conversations: Conversation[];
  hideSignOut?: boolean;
}) {
  const pathname = usePathname();
  const admin = role === "ADMIN";

  const item = (href: string, label: string, icon: React.ReactNode) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
        pathname === href && "bg-zinc-100 font-medium text-zinc-900",
      )}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-zinc-200 px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-zinc-900 text-xs font-semibold text-white">
          P
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">PrivateAI</p>
          <p className="truncate text-xs text-zinc-500">{companyName}</p>
        </div>
      </div>
      <div className="p-3">
        <Link href="/">
          <Button className="w-full justify-start gap-2">
            <Plus className="size-4" />
            New chat
          </Button>
        </Link>
      </div>
      <nav className="space-y-1 px-3">
        {item("/", "Chat", <MessageSquare className="size-4" />)}
        {item("/documents", "Documents", <FileText className="size-4" />)}
        {admin ? item("/admin", "Admin", <LayoutDashboard className="size-4" />) : null}
        {admin ? item("/admin/users", "Users", <Users className="size-4" />) : null}
        {admin ? item("/admin/settings", "Settings", <Settings className="size-4" />) : null}
      </nav>
      <div className="mt-4 px-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
        Conversations
      </div>
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-0.5">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-xs text-zinc-400">No conversations yet</p>
          ) : (
            conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/c/${conversation.id}`}
                className={cn(
                  "block truncate rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100",
                  pathname === `/c/${conversation.id}` && "bg-zinc-100 text-zinc-900",
                )}
              >
                {conversation.title}
              </Link>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="flex items-center justify-between border-t border-zinc-200 px-3 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="text-xs text-zinc-500">{admin ? "Admin" : "Employee"}</p>
        </div>
        {hideSignOut ? null : (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        )}
      </div>
    </aside>
  );
}
