
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { completeOnboarding } from "@/lib/onboarding";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      try {
        if (params.error) {
          throw new Error(
            params.error_description ?? "Authentication failed."
          );
        }

        if (!params.code) {
          throw new Error("No authentication code found.");
        }

        const { data, error } =
          await supabase.auth.exchangeCodeForSession(params.code);

        if (error) throw error;

        const user = data.session?.user;

        if (!user) {
          throw new Error("No authenticated user was returned.");
        }

        console.log("AUTH SUCCESS:", user.id);

        // Save any onboarding data collected before authentication.
        const stored = await AsyncStorage.getItem("@euno/onboarding");

        if (stored) {
          const onboarding = JSON.parse(stored);

          await completeOnboarding(user.id, onboarding);

          await AsyncStorage.removeItem("@euno/onboarding");

          console.log("ONBOARDING SAVED");
        }

        // Check whether the authenticated user has a username.
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!active) return;

        const username = profile?.username?.trim();

        if (!username) {
          router.replace("/(onboarding)/username");
          return;
        }

        // Existing username: let the root route handle app navigation.
        router.replace("/");
      } catch (error) {
        console.error("AUTH CALLBACK FAILED:", error);

        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Something went wrong while signing you in."
          );
        }
      }
    }

    handleCallback();

    return () => {
      active = false;
    };
  }, [params.code, params.error, params.error_description]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <ActivityIndicator />

      <Text style={{ marginTop: 16, textAlign: "center" }}>
        {message}
      </Text>
    </View>
  );
}
