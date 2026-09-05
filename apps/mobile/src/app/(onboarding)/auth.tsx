import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { OnboardingProgress } from "../../components/onboarding/OnboardingProgress";
import { TOPICS } from "../../components/onboarding/CuriosityTopics";
import { useTheme } from "@/hooks/use-theme";
import { useOnboarding } from "@/contexts/onboarding";
import type { OnboardingDepth } from "@/contexts/onboarding";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEPTH_LABELS: Record<OnboardingDepth, string> = {
  quick: "Quick glances",
  balanced: "Balanced",
  deep: "Deep dives",
};

type SaveStatus = "idle" | "saving" | "saved";

export default function AuthScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { interests, goals, depth } = useOnboarding();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const emailRef = useRef<TextInput>(null);
  const checkScale = useSharedValue(0.5);
  const checkOpacity = useSharedValue(0);

  const emailValid = EMAIL_PATTERN.test(email);
  const canSave = status === "idle" && emailValid;

  const selectedTopicLabels = useMemo(() => {
    const topics = TOPICS.filter((topic) => interests.includes(topic.id));
    if (topics.length === 0) {
      return { visible: [], remaining: 0 };
    }
    return {
      visible: topics.slice(0, 4).map((topic) => topic.label),
      remaining: topics.length - 4,
    };
  }, [interests]);

  const goalsText = useMemo(
    () => (goals.length > 0 ? goals.join(" · ") : null),
    [goals]
  );

  const handleSave = useCallback((): void => {
    if (!canSave) return;
    setStatus("saving");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // Real auth (Supabase) wiring comes later — profile creation happens
    // after authentication. For now the flow ends in a quiet saved state.
    setTimeout(() => {
      setStatus("saved");
      checkScale.value = withSpring(1, { damping: 14, stiffness: 190 });
      checkOpacity.value = withTiming(1, { duration: 240 });
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    }, 900);
  }, [canSave, checkOpacity, checkScale]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const saved = status === "saved";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(360)}>
            <OnboardingProgress position={4} total={4} />
            <Text style={styles.eyebrow}>Keep it close</Text>
            <Text style={styles.title}>
              Let’s keep this{"\n"}
              with you.
            </Text>
            <Text style={styles.subtext}>
              Everything we just found — threads, direction, depth — stays
              yours. It only lives here so it can follow you.
            </Text>
          </Animated.View>

          {!saved ? (
            <>
              <Animated.View
                entering={FadeInDown.duration(420).delay(80)}
                style={styles.recap}
              >
                <Text style={styles.recapLabel}>What we found together</Text>
                <View style={styles.recapRow}>
                  <Text style={styles.recapKey}>Interests</Text>
                  {selectedTopicLabels.visible.length > 0 ? (
                    <Text style={styles.recapValue}>
                      {selectedTopicLabels.visible.join(" · ")}
                      {selectedTopicLabels.remaining > 0
                        ? `  +${selectedTopicLabels.remaining}`
                        : ""}
                    </Text>
                  ) : (
                    <Text style={styles.recapValueMuted}>None yet</Text>
                  )}
                </View>
                <View style={styles.recapRow}>
                  <Text style={styles.recapKey}>Direction</Text>
                  <Text style={styles.recapValue}>
                    {goalsText ?? "Not chosen yet"}
                  </Text>
                </View>
                <View style={styles.recapRow}>
                  <Text style={styles.recapKey}>Depth</Text>
                  <Text style={styles.recapValue}>
                    {depth ? DEPTH_LABELS[depth] : "Not chosen yet"}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(420).delay(140)}
                style={styles.form}
              >
                <Text style={styles.inputLabel}>Your email</Text>
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.onboardingTextMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  editable={status !== "saving"}
                  accessibilityLabel="Email address"
                  style={[styles.input]}
                />
                <Text style={styles.microcopy}>
                  Private to you. No newsletters, no noise — this just keeps
                  your curiosity saved.
                </Text>
              </Animated.View>
            </>
          ) : (
            <Animated.View
              entering={FadeInDown.duration(500)}
              style={styles.savedWrap}
            >
              <Animated.View style={[styles.checkCircle, checkStyle]}>
                <Text style={styles.checkMark}>✓</Text>
              </Animated.View>
              <Text style={styles.savedTitle}>Saved.</Text>
              <Text style={styles.savedText}>
                Your curiosity is kept close. Your first discovery is on its
                way.
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {!saved && (
          <Animated.View
            style={styles.footer}
            entering={FadeInUp.duration(380).delay(200)}
          >
            <Pressable
              style={[
                styles.button,
                canSave ? styles.buttonReady : styles.buttonMuted,
              ]}
              disabled={!canSave}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Save my curiosity"
              accessibilityState={{ disabled: !canSave }}
            >
              <Text
                style={[
                  styles.buttonText,
                  canSave ? styles.buttonTextReady : styles.buttonTextMuted,
                ]}
              >
                {status === "saving" ? "Saving…" : "Save my curiosity"}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.onboardingBackground,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 40,
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
      lineHeight: 22,
      color: theme.onboardingTextMuted,
    },
    recap: {
      marginTop: 36,
      marginBottom: 8,
      padding: 20,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.onboardingBorder,
      backgroundColor: theme.onboardingSurface,
      gap: 14,
    },
    recapLabel: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: theme.onboardingAccent,
      marginBottom: 2,
    },
    recapRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    recapKey: {
      width: 76,
      fontSize: 14,
      fontWeight: "600",
      color: theme.onboardingTextMuted,
    },
    recapValue: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: theme.onboardingText,
    },
    recapValueMuted: {
      flex: 1,
      fontSize: 14,
      color: theme.onboardingTextMuted,
    },
    form: {
      marginTop: 28,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.onboardingText,
      marginBottom: 8,
    },
    input: {
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.onboardingBorder,
      backgroundColor: theme.onboardingSurface,
      fontSize: 16,
      color: theme.onboardingText,
    },
    microcopy: {
      marginTop: 10,
      fontSize: 13,
      lineHeight: 18,
      color: theme.onboardingTextMuted,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    button: {
      paddingVertical: 17,
      borderRadius: 30,
      alignItems: "center",
      borderWidth: 1,
    },
    buttonMuted: {
      backgroundColor: theme.onboardingSurface,
      borderColor: theme.onboardingBorder,
    },
    buttonReady: {
      backgroundColor: theme.onboardingAccent,
      borderColor: theme.onboardingAccent,
      shadowColor: theme.onboardingAccent,
      shadowOpacity: 0.34,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 7,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    buttonTextMuted: {
      color: theme.onboardingTextMuted,
    },
    buttonTextReady: {
      color: theme.onboardingOnAccent,
    },
    savedWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 60,
    },
    checkCircle: {
      width: 84,
      height: 84,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.onboardingAccent,
      shadowColor: theme.onboardingAccent,
      shadowOpacity: 0.3,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      marginBottom: 24,
    },
    checkMark: {
      fontSize: 40,
      fontWeight: "800",
      color: theme.onboardingOnAccent,
    },
    savedTitle: {
      fontSize: 30,
      lineHeight: 38,
      fontWeight: "700",
      letterSpacing: -0.5,
      color: theme.onboardingText,
      marginBottom: 10,
    },
    savedText: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.onboardingTextMuted,
      textAlign: "center",
      maxWidth: 280,
    },
  });
}