"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SettingsForm({
  settings,
}: {
  settings: {
    chatModel: string;
    embeddingModel: string;
    topK: number;
    temperature: number;
    systemPrompt: string;
  };
}) {
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          topK: Number(form.topK),
          temperature: Number(form.temperature),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Save failed");
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
      <div className="space-y-2">
        <Label>Chat model</Label>
        <Input
          value={form.chatModel}
          onChange={(event) => setForm({ ...form, chatModel: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Embedding model</Label>
        <Input
          value={form.embeddingModel}
          onChange={(event) => setForm({ ...form, embeddingModel: event.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Top K</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={form.topK}
            onChange={(event) => setForm({ ...form, topK: Number(event.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Temperature</Label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={form.temperature}
            onChange={(event) => setForm({ ...form, temperature: Number(event.target.value) })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>System prompt</Label>
        <Textarea
          className="min-h-40"
          value={form.systemPrompt}
          onChange={(event) => setForm({ ...form, systemPrompt: event.target.value })}
        />
      </div>
      <Button disabled={busy} onClick={() => void save()}>
        {busy ? "Saving..." : "Save settings"}
      </Button>
    </div>
  );
}
