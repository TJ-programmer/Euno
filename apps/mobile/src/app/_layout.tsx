import { Stack } from "expo-router";
import { AuthProvider } from "@/providers/AuthProvider";
import { OnboardingProvider } from "@/contexts/onboarding";

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </OnboardingProvider>
    </AuthProvider>
  );
}
