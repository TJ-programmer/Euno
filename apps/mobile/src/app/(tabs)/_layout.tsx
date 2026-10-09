
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, Tabs } from "expo-router";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";
import AnimatedTabBar from "@/components/AnimatedTabBar";
import { useAuthContext } from "@/providers/AuthProvider";
import { getUsername } from "@/lib/profile";

export default function TabsLayout() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const { user, loading } = useAuthContext();

  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    let active = true;
    setVerifiedUserId(null);

    async function verifyAccess() {
      if (!user) {
        router.replace("/(onboarding)/start");
        return;
      }

      try {
        const username = await getUsername(user.id);
        if (!active) return;

        if (!username) {
          router.replace("/(onboarding)/username");
          return;
        }

        setVerifiedUserId(user.id);
      } catch (error) {
        console.error("Failed to verify tab access:", error);
        // Fail closed: do not render protected tabs if verification fails.
      }
    }

    verifyAccess();

    return () => {
      active = false;
    };
  }, [user?.id, loading]);

  if (loading || !user || verifiedUserId !== user.id) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: "shift",
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="flow" options={{ title: "Flow" }} />
      <Tabs.Screen name="you" options={{ title: "You" }} />
    </Tabs>
  );
}
