import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdminPage } from "@/services/auth/session";
import { getAiSettings } from "@/services/settings";

export default async function SettingsPage() {
  const admin = await requireAdminPage();
  const settings = await getAiSettings(admin.companyId);
  return (
    <div className="h-full overflow-auto p-8">
      <h1 className="text-xl font-semibold tracking-tight">AI settings</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-500">
        Model names are passed to Ollama. Infrastructure URLs stay in environment variables.
      </p>
      <SettingsForm
        settings={{
          chatModel: settings.chatModel,
          embeddingModel: settings.embeddingModel,
          topK: settings.topK,
          temperature: settings.temperature,
          systemPrompt: settings.systemPrompt,
        }}
      />
    </div>
  );
}
