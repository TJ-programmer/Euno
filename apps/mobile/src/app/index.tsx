import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthContext } from "@/providers/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const { session, loading: authLoading } = useAuthContext();

  const [checkingProfile, setCheckingProfile] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    if (!session?.user) {
      setOnboardingCompleted(null);
      setCheckingProfile(false);
      return;
    }

    let mounted = true;

    const checkProfile = async () => {
      setCheckingProfile(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("PROFILE CHECK ERROR:", error);
        setOnboardingCompleted(false);
      } else {
        console.log(
          "ONBOARDING COMPLETED:",
          data?.onboarding_completed ?? false
        );

        setOnboardingCompleted(data?.onboarding_completed ?? false);
      }

      setCheckingProfile(false);
    };

    checkProfile();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  // Auth state is still loading
  if (authLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  // Not authenticated → onboarding/auth
  if (!session) {
    return <Redirect href="/(onboarding)/start" />;
  }

  // Authenticated but profile is still being checked
  if (checkingProfile || onboardingCompleted === null) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  // Authenticated + onboarding finished → Home
  if (onboardingCompleted) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Authenticated but onboarding isn't finished
  return <Redirect href="/(onboarding)/start" />;
}
