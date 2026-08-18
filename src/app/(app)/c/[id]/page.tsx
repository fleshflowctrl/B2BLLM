import { notFound } from "next/navigation";
import { ChatPanel, type ChatMessage } from "@/components/chat/chat-panel";
import { getConversation } from "@/lib/db";
import { requireUserPage } from "@/services/auth/session";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  const { id } = await params;
  const conversation = await getConversation(id, user.companyId, user.id);
  if (!conversation) notFound();

  const initialMessages: ChatMessage[] = conversation.messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    citations: (message.citations as ChatMessage["citations"]) ?? [],
  }));

  return <ChatPanel conversationId={conversation.id} initialMessages={initialMessages} />;
}
