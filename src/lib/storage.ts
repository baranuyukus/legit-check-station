import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

/** Resolves a stored image reference to a displayable URL. */
export async function resolveImageUrl(ref: string | null): Promise<string | null> {
  if (!ref) return null;
  if (ref.startsWith("http")) return ref;
  if (cache.has(ref)) return cache.get(ref)!;

  const { data } = await supabase.storage
    .from("item-images")
    .createSignedUrl(ref, 60 * 60 * 24 * 7);

  if (data?.signedUrl) {
    cache.set(ref, data.signedUrl);
    return data.signedUrl;
  }
  return null;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${m}.${d}.${y}`;
}
