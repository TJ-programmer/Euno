import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";

const AUTO_ADVANCE_MS = 1900;

export default function EunoMomentScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { message, subtext, next } = useLocalSearchParams<{
    message?: string;
    subtext?: string;
    next?: string;
  }>();

  const messageText = Array.isArray(message) ? message[0] : message;
  const subtextText = Array.isArray(subtext) ? subtext[0] : subtext;
  const nextRoute =
    (Array.isArray(next) ? next[0] : next) as Href | null | undefined;

  const markScale = useSharedValue(0.6);
  const markOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0.5);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 240 });
    markScale.value = withSpring(1, { damping: 14, stiffness: 190 });
    ringScale.value = withDelay(
      160,
      withTiming(1.35, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      })
    );
    ringOpacity.value = withDelay(
      160,
      withTiming(0, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      })
    );

    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});

    if (!nextRoute) return;

    const timer = setTimeout(() => {
      router.replace(nextRoute);
    }, AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [markOpacity, markScale, ringScale, ringOpacity, nextRoute]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const goNext = (): void => {
    if (nextRoute) {
      router.replace(nextRoute);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable
        style={styles.pressable}
        onPress={goNext}
        accessibilityRole="button"
        accessibilityLabel={
          messageText ?? ""
        }
      >
        <View style={styles.center}>
          <View style={styles.markWrap}>
            <Animated.View style={[styles.ring, ringStyle]} />
            <Animated.View style={[styles.mark, markStyle]}>
              <Text style={styles.markText}>e</Text>
            </Animated.View>
          </View>

          <Animated.View entering={FadeInDown.duration(420).delay(180)}>
            {messageText ? (
              <Text style={styles.message}>{messageText}</Text>
            ) : null}
            {subtextText ? (
              <Text style={styles.subtext}>{subtextText}</Text>
            ) : null}
          </Animated.View>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.onboardingBackground,
    },
    pressable: {
      flex: 1,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    markWrap: {
      width: 150,
      height: 150,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 36,
    },
    ring: {
      position: "absolute",
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 1.5,
      borderColor: theme.onboardingAccent,
    },
    mark: {
      width: 96,
      height: 96,
      borderRadius: 32,
      backgroundColor: theme.onboardingAccent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.onboardingAccent,
      shadowOpacity: 0.3,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    markText: {
      fontSize: 52,
      fontWeight: "800",
      color: theme.onboardingOnAccent,
    },
    message: {
      fontSize: 30,
      lineHeight: 38,
      fontWeight: "700",
      letterSpacing: -0.5,
      textAlign: "center",
      color: theme.onboardingText,
      marginBottom: 12,
    },
    subtext: {
      fontSize: 16,
      lineHeight: 24,
      textAlign: "center",
      color: theme.onboardingTextMuted,
    },
  });
}