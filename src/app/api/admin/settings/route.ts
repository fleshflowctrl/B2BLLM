import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { badRequest } from "@/lib/errors";
import { updateAiSettings } from "@/lib/db";
import { requireAdmin } from "@/services/auth/session";
import { getAiSettings } from "@/services/settings";

const patchSchema = z.object({
  chatModel: z.string().min(1).max(120).optional(),
  embeddingModel: z.string().min(1).max(120).optional(),
  topK: z.number().int().min(1).max(20).optional(),
  temperature: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().min(1).max(8000).optional(),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    const settings = await getAiSettings(admin.companyId);
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) throw badRequest("Invalid settings");
    const current = await getAiSettings(admin.companyId);
    const settings = await updateAiSettings(current.id, parsed.data);
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
