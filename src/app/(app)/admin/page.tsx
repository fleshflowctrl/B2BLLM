import { countRows } from "@/lib/db";
import { requireAdminPage } from "@/services/auth/session";

export default async function AdminDashboardPage() {
  const admin = await requireAdminPage();
  const companyId = admin.companyId;
  const [documents, users, departments, conversations, processing, failed] = await Promise.all([
    countRows("Document", { companyId }),
    countRows("User", { companyId }),
    countRows("Department", { companyId }),
    countRows("Conversation", { companyId }),
    countRows("Document", { companyId, status: "PROCESSING" }),
    countRows("Document", { companyId, status: "FAILED" }),
  ]);

  const cards = [
    ["Documents", documents],
    ["Users", users],
    ["Departments", departments],
    ["Chats", conversations],
    ["Processing", processing],
    ["Failed jobs", failed],
  ] as const;

  return (
    <div className="h-full overflow-auto p-8">
      <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-zinc-500">Workspace overview for {admin.companyName}.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
