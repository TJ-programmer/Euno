import { supabase } from "@/lib/supabase";

export async function getHomeContent() {
  const { data, error } = await supabase
    .from("content_items")
    .select(`
      id,
      slug,
      content_type,
      title,
      hook,
      summary,
      body,
      image_url,
      estimated_minutes,
      difficulty,
      quality_score,
      published_at,
      content_presentations (
        surface,
        label,
        display_title,
        display_summary,
        payload
      )
    `)
    .eq("status", "published")
    .eq("content_presentations.surface", "home")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("GET HOME CONTENT ERROR:", error);
    throw error;
  }

  return data ?? [];
}
