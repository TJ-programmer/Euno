
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthContext } from "@/providers/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProfileStatus = {
  username: string | null;
  onboardingCompleted: boolean;
};

export default function Index() {
  const { session, loading: authLoading } = useAuthContext();

  const [checkingProfile, setCheckingProfile] = useState(false);
  const [profileStatus, setProfileStatus] =
    useState<ProfileStatus | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const userId = session?.user?.id;

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setProfileStatus(null);
      setCheckingProfile(false);
      setProfileError(false);
      return;
    }

    let mounted = true;

    const checkProfile = async () => {
      setCheckingProfile(true);
      setProfileStatus(null);
      setProfileError(false);

      const { data, error } = await supabase
        .from("profiles")
        .select("username, onboarding_completed")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("PROFILE CHECK ERROR:", error);
        setProfileError(true);
        setCheckingProfile(false);
        return;
      }

      const username = data?.username?.trim() || null;
      const onboardingCompleted = data?.onboarding_completed ?? false;

      console.log("PROFILE STATUS:", {
        userId,
        hasUsername: Boolean(username),
        onboardingCompleted,
      });

      setProfileStatus({
        username,
        onboardingCompleted,
      });

      setCheckingProfile(false);
    };

    checkProfile();

    return () => {
      mounted = false;
    };
  }, [userId, authLoading, retryCount]);

  // 1. Wait for Supabase to restore the session.
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

  // 2. Not authenticated → onboarding/auth entry.
  if (!session) {
    return <Redirect href="/(onboarding)/start" />;
  }

  // 3. Profile request is in progress.
  if (checkingProfile || profileStatus === null && !profileError) {
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

  // 4. Profile could not be checked.
  // Do not incorrectly treat a network/database error as missing onboarding.
  if (profileError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <ActivityIndicator animating={false} />
        <View style={{ height: 16 }} />
        <Redirect href="/" />
      </View>
    );
  }

  // A successful query with no profile row also leaves the username missing.
  const username = profileStatus?.username;
  const onboardingCompleted = profileStatus?.onboardingCompleted ?? false;

  // 5. Authenticated but username has not been set.
  if (!username) {
    return <Redirect href="/(onboarding)/username" />;
  }

  // 6. Username exists, but onboarding is incomplete.
  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)/start" />;
  }

  // 7. Username exists and onboarding is complete → Home.
  return <Redirect href="/(tabs)/home" />;
}
