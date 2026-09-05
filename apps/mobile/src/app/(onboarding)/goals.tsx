import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";
import { OnboardingProgress } from "../../components/onboarding/OnboardingProgress";
import { useTheme } from "@/hooks/use-theme";

const GOALS: string[] = [
  "Learn something",
  "Build something",
  "Get inspired",
  "Connect with people",
];

function GoalCard({
  goal,
  selected,
  onToggle,
  theme,
}: {
  goal: string;
  selected: boolean;
  onToggle: (goal: string) => void;
  theme: ReturnType<typeof useTheme>;
}): React.JSX.Element {
  const styles = useMemo(() => createCardStyles(theme), [theme]);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback((): void => {
    Haptics.selectionAsync();
    scale.value = withTiming(0.98, { duration: 90 }, () => {
      scale.value = withTiming(1, { duration: 160 });
    });
    onToggle(goal);
  }, [goal, onToggle, scale]);

  return (
    <Animated.View
      entering={FadeInDown.duration(320)}
      style={animatedStyle}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={goal}
        accessibilityState={{ selected }}
        style={[
          styles.card,
          selected ? styles.cardSelected : styles.cardUnselected,
        ]}
      >
        <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>
          {goal}
        </Text>
        <View
          style={[
            styles.check,
            selected ? styles.checkSelected : styles.checkUnselected,
          ]}
        >
          {selected && (
            <Text style={styles.checkMark}>✓</Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function GoalsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const ctaOpacity = useSharedValue(0.5);

  const hasSelection = selectedGoals.length > 0;

  const handleToggleGoal = useCallback(
    (goal: string): void => {
      setSelectedGoals((current) => {
        const next = current.includes(goal)
          ? current.filter((g) => g !== goal)
          : [...current, goal];
        ctaOpacity.value = withTiming(next.length > 0 ? 1 : 0.5, {
          duration: 200,
        });
        return next;
      });
    },
    [ctaOpacity]
  );

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <OnboardingProgress position={2} total={4} />
          <Text style={styles.eyebrow}>Your why</Text>
          <Text style={styles.title}>
            What do you want{"\n"}
            more of?
          </Text>
          <Text style={styles.subtext}>Pick as many as you like.</Text>
        </View>

        <View style={styles.options}>
          {GOALS.map((goal) => (
            <GoalCard
              key={goal}
              goal={goal}
              selected={selectedGoals.includes(goal)}
              onToggle={handleToggleGoal}
              theme={theme}
            />
          ))}
        </View>

        <Animated.View style={[styles.buttonWrap, ctaAnimatedStyle]}>
          <Pressable
            style={styles.button}
            disabled={!hasSelection}
            onPress={() => {
              // Depth screen not implemented yet — press feedback only.
            }}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.onboardingBackground,
    },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 40,
      paddingBottom: 32,
    },
    header: {
      marginBottom: 36,
    },
    eyebrow: {
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: theme.onboardingAccent,
      marginBottom: 12,
    },
    title: {
      fontSize: 34,
      lineHeight: 42,
      fontWeight: "700",
      letterSpacing: -0.5,
      color: theme.onboardingText,
      marginBottom: 12,
    },
    subtext: {
      fontSize: 15,
      lineHeight: 20,
      color: theme.onboardingTextMuted,
    },
    options: {
      gap: 12,
    },
    buttonWrap: {
      marginTop: "auto",
    },
    button: {
      paddingVertical: 17,
      borderRadius: 30,
      alignItems: "center",
      backgroundColor: theme.onboardingAccent,
      shadowColor: theme.onboardingAccent,
      shadowOpacity: 0.22,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 5,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.onboardingOnAccent,
      letterSpacing: 0.2,
    },
  });
}

function createCardStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderRadius: 18,
      borderWidth: 1,
    },
    cardUnselected: {
      backgroundColor: theme.onboardingSurface,
      borderColor: theme.onboardingBorder,
    },
    cardSelected: {
      backgroundColor: theme.onboardingAccent,
      borderColor: theme.onboardingAccent,
    },
    cardLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.onboardingText,
    },
    cardLabelSelected: {
      color: theme.onboardingOnAccent,
    },
    check: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
    },
    checkUnselected: {
      borderColor: theme.onboardingBorder,
      backgroundColor: "transparent",
    },
    checkSelected: {
      borderColor: theme.onboardingOnAccent,
      backgroundColor: theme.onboardingAccentSoft,
    },
    checkMark: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.onboardingAccent,
    },
  });
}