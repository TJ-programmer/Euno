import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";

const ENTRANCE_DURATION = 420;

export default function OnboardingStartScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const brandOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(24);
  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(1);

  useEffect(() => {
    brandOpacity.value = withDelay(
      80,
      withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      })
    );

    const contentTiming = {
      duration: ENTRANCE_DURATION,
      easing: Easing.out(Easing.cubic),
    };
    contentOpacity.value = withDelay(160, withTiming(1, contentTiming));
    contentTranslateY.value = withDelay(160, withTiming(0, contentTiming));

    ctaOpacity.value = withDelay(
      320,
      withTiming(1, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [brandOpacity, contentOpacity, contentTranslateY, ctaOpacity]);

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

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

  const handleExplore = (): void => {
    router.push("/(onboarding)/curiosity");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.decor} pointerEvents="none">
        <View style={styles.decorRing} />
        <View style={styles.decorOrb} />
      </View>

      <View style={styles.container}>
        <Animated.View style={[styles.brand, brandStyle]}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>e</Text>
          </View>
          <Text style={styles.brandName}>euno</Text>
        </Animated.View>

        <Animated.View style={[styles.content, contentStyle]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>Curiosity, made meaningful</Text>
          </View>

          <Text style={styles.headline}>
            Let’s find out{"\n"}what pulls you in
          </Text>
          <Text style={styles.body}>
            A place designed to make your time feel meaningful,{"\n"}not just
            make it disappear.
          </Text>
        </Animated.View>

        <View style={styles.ctaWrapper}>
          <Animated.View style={ctaAnimatedStyle}>
            <Pressable
              onPress={handleExplore}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              accessibilityRole="button"
              accessibilityLabel="Start exploring your curiosity"
              style={styles.cta}
            >
              <Text style={styles.ctaLabel}>Start exploring</Text>
              <Text style={styles.ctaArrow}>→</Text>
            </Pressable>
          </Animated.View>
        </View>
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
    decor: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    decorRing: {
      position: "absolute",
      top: -110,
      right: -90,
      width: 260,
      height: 260,
      borderRadius: 130,
      borderWidth: 1,
      borderColor: theme.onboardingBorder,
      opacity: 0.7,
    },
    decorOrb: {
      position: "absolute",
      bottom: 90,
      left: -70,
      width: 170,
      height: 170,
      borderRadius: 85,
      backgroundColor: theme.onboardingAccentSoft,
      opacity: 0.55,
    },
    container: {
      flex: 1,
      paddingHorizontal: 28,
      paddingBottom: 24,
      paddingTop: 24,
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    brandMark: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: theme.onboardingAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    brandMarkText: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.onboardingOnAccent,
    },
    brandName: {
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: 0.2,
      color: theme.onboardingText,
    },
    content: {
      flex: 1,
      justifyContent: "center",
    },
    eyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    eyebrowDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.onboardingAccent,
    },
    eyebrow: {
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: theme.onboardingAccent,
    },
    headline: {
      fontSize: 40,
      lineHeight: 48,
      fontWeight: "700",
      letterSpacing: -0.8,
      color: theme.onboardingText,
      marginBottom: 20,
    },
    body: {
      fontSize: 17,
      lineHeight: 26,
      color: theme.onboardingTextMuted,
      maxWidth: 360,
    },
    ctaWrapper: {
      alignItems: "flex-start",
    },
    cta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 17,
      paddingHorizontal: 28,
      borderRadius: 30,
      backgroundColor: theme.onboardingAccent,
      shadowColor: theme.onboardingAccent,
      shadowOpacity: 0.28,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    ctaLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.onboardingOnAccent,
      letterSpacing: 0.2,
    },
    ctaArrow: {
      fontSize: 18,
      color: theme.onboardingOnAccent,
    },
  });
}