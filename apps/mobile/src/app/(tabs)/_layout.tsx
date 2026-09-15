import { Tabs } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import AnimatedTabBar from "@/components/AnimatedTabBar";

export default function TabsLayout() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: "shift", // smooth cross-fade/shift between tab screens
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="flow" options={{ title: "Flow" }} />
      <Tabs.Screen name="you" options={{ title: "You" }} />
    </Tabs>
  );
}
