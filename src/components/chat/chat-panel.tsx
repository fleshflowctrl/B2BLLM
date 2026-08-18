"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ChatCitation = {
  documentId: string;
  filename: string;
  chunkId: string;
  pageNumber: number | null;
  excerpt: string;
  score: number;
};

export type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: ChatCitation[] | null;
};

export function ChatPanel({
  conversationId,
  initialMessages,
}: {
  conversationId?: string;
  initialMessages?: ChatMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeId = useRef(conversationId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function send(question: string, regenerate = false) {
    if (pending) return;
    setPending(true);
    if (!regenerate) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "USER", content: question },
      ]);
      setInput("");
    } else {
      setMessages((current) => {
        const next = [...current];
        if (next.at(-1)?.role === "ASSISTANT") next.pop();
        return next;
      });
    }

    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: assistantId, role: "ASSISTANT", content: "", citations: [] },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId.current,
          message: regenerate ? undefined : question,
          regenerate,
        }),
      });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({ error: "Chat failed" }));
        throw new Error(payload.error || "Chat failed");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.replace(/^data: /, "").trim();
          if (!line) continue;
          const event = JSON.parse(line) as {
            type: string;
            conversationId?: string;
            title?: string;
            text?: string;
            citations?: ChatCitation[];
            error?: string;
          };
          if (event.type === "meta" && event.conversationId) {
            if (!activeId.current) {
              activeId.current = event.conversationId;
              router.replace(`/c/${event.conversationId}`);
            }
          }
          if (event.type === "token" && event.text) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + event.text }
                  : message,
              ),
            );
          }
          if (event.type === "done") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, citations: event.citations ?? [] }
                  : message,
              ),
            );
            router.refresh();
          }
          if (event.type === "error") throw new Error(event.error || "Chat failed");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chat failed");
      setMessages((current) => current.filter((message) => message.id !== assistantId));
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    void send(question);
  }

  const lastUser = [...messages].reverse().find((message) => message.role === "USER");

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ScrollArea className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
          {messages.length === 0 ? (
            <div className="pt-24 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Ask your company knowledge</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Answers are grounded in documents you are allowed to see, with sources attached.
              </p>
            </div>
          ) : null}
          {messages.map((message) => (
            <div key={message.id} className={cn("flex", message.role === "USER" && "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6",
                  message.role === "USER"
                    ? "bg-zinc-900 text-white"
                    : "bg-white ring-1 ring-zinc-200",
                )}
              >
                <p className="whitespace-pre-wrap">{message.content || (pending ? "..." : "")}</p>
                {message.role === "ASSISTANT" && message.content ? (
                  <div className="mt-3 flex gap-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        void navigator.clipboard.writeText(message.content);
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="size-3.5" />
                      Copy
                    </Button>
                    {lastUser && messages.at(-1)?.id === message.id ? (
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => void send(lastUser.content, true)}
                      >
                        <RefreshCw className="size-3.5" />
                        Regenerate
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {message.citations && message.citations.length > 0 ? (
                  <div className="mt-4 border-t border-zinc-200 pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Sources
                    </p>
                    <div className="space-y-2">
                      {message.citations.map((citation) => (
                        <Link
                          key={citation.chunkId}
                          href={`/documents/${citation.documentId}`}
                          className="block rounded-lg bg-zinc-50 p-2.5 hover:bg-zinc-100"
                        >
                          <p className="text-xs font-medium text-zinc-800">
                            {citation.filename}
                            {citation.pageNumber ? ` · p. ${citation.pageNumber}` : ""}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{citation.excerpt}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="border-t border-zinc-200 bg-white px-6 py-4">
        <form className="mx-auto flex w-full max-w-3xl items-end gap-2" onSubmit={onSubmit}>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask anything about your company..."
            className="min-h-12 resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit(event);
              }
            }}
          />
          <Button type="submit" disabled={pending || !input.trim()} size="icon">
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
