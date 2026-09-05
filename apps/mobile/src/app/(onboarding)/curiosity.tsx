import React, { useCallback, useMemo, useState } from "react";
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

export default function CuriosityScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const ctaScale = useSharedValue(1);
  const ctaOpacity = useSharedValue(0.5);

  const hasSelection = useMemo(
    () => selectedTopics.length > 0,
    [selectedTopics]
  );

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

      ctaOpacity.value = withTiming(nextCount > 0 ? 1 : 0.5, {
        duration: 200,
      });
    },
    [selectedTopics, ctaOpacity]
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
    router.push("/(onboarding)/goals");
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
          <Text style={styles.subtext}>
            {selectedTopics.length > 0
              ? `${selectedTopics.length} selected — pick more or keep going.`
              : "Pick as many as you like."}
          </Text>
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
            disabled={!hasSelection}
            accessibilityRole="button"
            accessibilityLabel="Keep going"
            accessibilityState={{ disabled: !hasSelection }}
            style={styles.cta}
          >
            <Text style={styles.ctaLabel}>
              {hasSelection
                ? `Keep going · ${selectedTopics.length}`
                : "Keep going"}
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
      backgroundColor: theme.onboardingAccent,
      alignItems: "center",
      shadowColor: theme.onboardingAccent,
      shadowOpacity: 0.22,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 5,
    },
    ctaLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.onboardingOnAccent,
      letterSpacing: 0.2,
    },
  });
}