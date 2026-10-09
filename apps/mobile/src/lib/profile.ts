import { supabase } from "@/lib/supabase";

/**
 * Returns the profile username, or null if the profile or username
 * has not been created yet.
 */
export async function getUsername(userId?: string): Promise<string | null> {
  let id = userId;

  if (!id) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) return null;

    id = user.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const username = data?.username?.trim();
  return username || null;
}

export async function saveUsername(username: string): Promise<void> {
  const normalized = username.trim();

  if (!normalized) {
    throw new Error("Please enter a username");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("No authenticated user");

  // Update the existing profile; do not create an unrelated user ID.
  const { data, error } = await supabase
    .from("profiles")
    .update({ username: normalized })
    .eq("id", user.id)
    .select("id, username")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Your profile was not found. Please try again or contact support."
    );
  }
}
