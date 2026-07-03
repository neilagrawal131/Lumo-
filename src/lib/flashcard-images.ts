import { supabase } from "@/integrations/supabase/client";

const BUCKET = "flashcard-images";
// Long-lived signed URL (~10 years) so shared sets keep displaying images.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

/**
 * Uploads an image for a flashcard into the current user's folder and returns a
 * long-lived signed URL that anyone (including people a set is shared with) can view.
 */
export async function uploadFlashcardImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;

  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr || !data) throw signErr ?? new Error("Could not create image URL");
  return data.signedUrl;
}
