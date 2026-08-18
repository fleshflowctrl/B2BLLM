import { createAuditLog, type AuditEvent } from "@/lib/db";

export async function writeAuditLog(input: {
  companyId: string;
  userId?: string | null;
  event: AuditEvent;
  metadata?: unknown;
  ipAddress?: string | null;
}) {
  await createAuditLog(input);
}
