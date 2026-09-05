import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { CuriosityTopics } from "../../components/onboarding/CuriosityTopics";
import { OnboardingProgress } from "../../components/onboarding/OnboardingProgress";
import { useTheme } from "@/hooks/use-theme";
import { useOnboarding } from "@/contexts/onboarding";

const MIN_SELECTIONS = 3;

export default function CuriosityScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { interests: selectedTopics, setInterests: setSelectedTopics } =
    useOnboarding();
  const ctaScale = useSharedValue(1);
  const ctaOpacity = useSharedValue(0.45);

  const count = selectedTopics.length;
  const canContinue = count >= MIN_SELECTIONS;

  const subtext = useMemo(() => {
    if (count === 0) {
      return "Pick anything that pulls you — at least 3 to begin.";
    }
    if (count < MIN_SELECTIONS) {
      return `Pick ${MIN_SELECTIONS - count} more to begin — this is about what lights you up.`;
    }
    return `${count} selected — lovely range. Keep going whenever it feels right.`;
  }, [count]);

  const handleToggleTopic = useCallback(
    (topicId: string): void => {
      const isSelected = selectedTopics.includes(topicId);
      const nextCount = isSelected
        ? selectedTopics.length - 1
        : selectedTopics.length + 1;

      setSelectedTopics((current) =>
        current.includes(topicId)
          ? current.filter((id) => id !== topicId)
          : [...current, topicId]
      );

      ctaOpacity.value = withTiming(nextCount >= MIN_SELECTIONS ? 1 : 0.45, {
        duration: 200,
      });
    },
    [selectedTopics, ctaOpacity, setSelectedTopics]
  );

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ scale: ctaScale.value }],
  }));

  const handlePressIn = (): void => {
    ctaScale.value = withTiming(0.97, { duration: 120 });
  };

  const handlePressOut = (): void => {
    ctaScale.value = withTiming(1, { duration: 160 });
  };

  const handleKeepGoing = (): void => {
    const responses = [
      "Great choices.",
      "Love the mix.",
      "Interesting combination.",
    ];
    const message = responses[count % responses.length];
    router.push({
      pathname: "/(onboarding)/moment",
      params: {
        message,
        subtext: `${count} topics noted — a lovely start.`,
        next: "/(onboarding)/goals",
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(360)}>
          <OnboardingProgress position={1} total={4} />
          <Text style={styles.eyebrow}>Your interests</Text>
          <Text style={styles.question}>What are you curious about?</Text>
          <Text style={styles.subtext}>{subtext}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(80)}>
          <CuriosityTopics
            selectedTopics={selectedTopics}
            onToggleTopic={handleToggleTopic}
          />
        </Animated.View>
      </ScrollView>

      <Animated.View
        style={styles.footer}
        entering={FadeInUp.duration(380).delay(140)}
      >
        <Animated.View style={ctaAnimatedStyle}>
          <Pressable
            onPress={handleKeepGoing}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!canContinue}
            accessibilityRole="button"
            accessibilityLabel="Keep going"
            accessibilityState={{ disabled: !canContinue }}
            style={[styles.cta, canContinue ? styles.ctaReady : styles.ctaMuted]}
          >
            <Text
              style={[
                styles.ctaLabel,
                canContinue ? styles.ctaLabelReady : styles.ctaLabelMuted,
              ]}
            >
              {canContinue ? `Keep going · ${count}` : "Keep going"}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.onboardingBackground,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 24,
    },
    eyebrow: {
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: theme.onboardingAccent,
      marginBottom: 12,
    },
    question: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: "700",
      color: theme.onboardingText,
      letterSpacing: -0.3,
      marginBottom: 8,
    },
    subtext: {
      fontSize: 15,
      lineHeight: 20,
      color: theme.onboardingTextMuted,
      marginBottom: 28,
    },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 20,
    },
    cta: {
      paddingVertical: 16,
      borderRadius: 30,
      alignItems: "center",
      borderWidth: 1,
    },
    ctaMuted: {
      backgroundColor: theme.onboardingSurface,
      borderColor: theme.onboardingBorder,
    },
    ctaReady: {
      backgroundColor: theme.onboardingAccent,
      borderColor: theme.onboardingAccent,
      shadowColor: theme.onboardingAccent,
      shadowOpacity: 0.34,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 7,
    },
    ctaLabel: {
      fontSize: 16,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    ctaLabelMuted: {
      color: theme.onboardingTextMuted,
    },
    ctaLabelReady: {
      color: theme.onboardingOnAccent,
    },
  });
}