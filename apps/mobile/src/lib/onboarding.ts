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

  const {
  data: { session },
  error: sessionError,
} = await supabase.auth.getSession();

console.log("ONBOARDING SESSION:", session?.user?.id ?? null);
console.log("ONBOARDING SESSION ERROR:", sessionError);

if (!session) {
  throw new Error("No active Supabase session while saving onboarding");
}

if (data.interests.length > 0) {
  const { error: interestsError } = await supabase
    .from("user_interests")
    .upsert(
      data.interests.map((topicId) => ({
        user_id: session.user.id,
        topic_id: topicId,
      })),
      {
        onConflict: "user_id,topic_id",
      }
    );

  if (interestsError) {
    console.error("INTERESTS SAVE ERROR:", interestsError);
    throw interestsError;
  }
}

  if (!user) {
    throw new Error("No authenticated Supabase user");
  }

  if (user.id !== userId) {
    throw new Error(
      `User ID mismatch. Auth user: ${user.id}, onboarding user: ${userId}`
    );
  }

  if (data.interests.length > 0) {
    const { error: interestsError } = await supabase
      .from("user_interests")
      .upsert(
        data.interests.map((topicId) => ({
          user_id: user.id,
          topic_id: topicId,
        })),
        {
          onConflict: "user_id,topic_id",
        }
      );

    if (interestsError) {
      console.error("INTERESTS SAVE ERROR:", interestsError);
      throw interestsError;
    }
  }

  const { error: progressError } = await supabase
    .from("onboarding_progress")
    .upsert({
      user_id: user.id,
      current_step: "complete",
      why_data: { goals: data.goals },
      depth_data: { depth: data.depth },
    });

  if (progressError) {
    console.error("PROGRESS SAVE ERROR:", progressError);
    throw progressError;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (profileError) {
    console.error("PROFILE SAVE ERROR:", profileError);
    throw profileError;
  }

  console.log("ONBOARDING SAVED SUCCESSFULLY");
}
