import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "company-documents";

export class SupabaseDocumentStorage {
  async upload(params: {
    companyId: string;
    documentId: string;
    filename: string;
    bytes: Buffer;
    contentType: string;
  }) {
    const path = `${params.companyId}/${params.documentId}/${params.filename}`;
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, params.bytes, {
      contentType: params.contentType,
      upsert: true,
    });
    if (error) throw new Error(error.message);
    return path;
  }

  async download(path: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) throw new Error(error?.message ?? "File not found");
    return Buffer.from(await data.arrayBuffer());
  }

  async remove(path: string) {
    const supabase = createAdminClient();
    await supabase.storage.from(BUCKET).remove([path]);
  }

  async signedUrl(path: string, expiresIn = 60) {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not create download link");
    return data.signedUrl;
  }
}
