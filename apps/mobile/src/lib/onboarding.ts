import { supabase } from "@/lib/supabase";

type OnboardingData = {
  interests: string[];
  goals: string[];
  depth: "quick" | "balanced" | "deep" | null;
};

export async function completeOnboarding(
  userId: string,
  data: OnboardingData
) {
  console.log("SAVING ONBOARDING:", data);
  console.log("USER ID PASSED TO ONBOARDING:", userId);

  // --------------------------------------------------
  // 1. Verify authenticated Supabase user
  // --------------------------------------------------

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("ONBOARDING AUTH USER:", user?.id ?? null);
  console.log("ONBOARDING USER ERROR:", authError);

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("No authenticated Supabase user");
  }

  if (user.id !== userId) {
    throw new Error(
      `User ID mismatch. Auth user: ${user.id}, onboarding user: ${userId}`
    );
  }

  console.log("ONBOARDING USER VERIFIED:", user.id);

  // --------------------------------------------------
  // 2. Save interests
  // --------------------------------------------------

  if (data.interests.length > 0) {
    const interestRows = data.interests.map((topicId) => ({
      user_id: user.id,
      topic_id: topicId,
    }));

    const { error: interestsError } = await supabase
      .from("user_interests")
      .upsert(interestRows, {
        onConflict: "user_id,topic_id",
      });

    if (interestsError) {
      console.error("INTERESTS SAVE ERROR:", interestsError);
      throw interestsError;
    }

    console.log("INTERESTS SAVED");
  }

  // --------------------------------------------------
  // 3. Save onboarding progress
  // --------------------------------------------------

  const { error: progressError } = await supabase
    .from("onboarding_progress")
    .upsert(
      {
        user_id: user.id,
        current_step: "complete",
        why_data: {
          goals: data.goals,
        },
        depth_data: {
          depth: data.depth,
        },
      },
      {
        onConflict: "user_id",
      }
    );

  if (progressError) {
    console.error("PROGRESS SAVE ERROR:", progressError);
    throw progressError;
  }

  console.log("PROGRESS SAVED");

  // --------------------------------------------------
  // 4. Mark profile onboarding as completed
  // --------------------------------------------------

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (profileError) {
    console.error("PROFILE SAVE ERROR:", profileError);
    throw profileError;
  }

  console.log("PROFILE ONBOARDING COMPLETED");

  // --------------------------------------------------
  // Done
  // --------------------------------------------------

  console.log("ONBOARDING SAVED SUCCESSFULLY");
}
