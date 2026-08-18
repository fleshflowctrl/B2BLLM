import { prisma } from "@/lib/prisma";
import type { AuditEvent, Prisma } from "@/generated/prisma/client";

export async function writeAuditLog(input: {
  companyId: string;
  userId?: string | null;
  event: AuditEvent;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      companyId: input.companyId,
      userId: input.userId ?? null,
      event: input.event,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
