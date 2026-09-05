import { Stack } from "expo-router";
import React from "react";
import { OnboardingProvider } from "@/contexts/onboarding";

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      />
    </OnboardingProvider>
  );
}