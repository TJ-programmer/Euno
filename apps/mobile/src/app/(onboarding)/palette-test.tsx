import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { PALETTES, type Palette } from "@/constants/palettes";

// Placeholder chip labels so the mini-mockup below reads like the real
// "curiosity" step instead of empty boxes.
const SAMPLE_TOPICS = ["Design", "Habits", "AI", "Focus", "Money", "Reading"];
const SAMPLE_SELECTED = ["Design", "Habits", "Focus"];

export default function PaletteTestScreen() {
  const [activeName, setActiveName] = useState(PALETTES[0].name);
  const active =
    PALETTES.find((palette) => palette.name === activeName) ?? PALETTES[0];
  const colors = active.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const ctaScale = useSharedValue(1);
  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const handleSelect = useCallback((palette: Palette): void => {
    Haptics.selectionAsync();
    setActiveName(palette.name);
  }, []);

  const handlePressIn = (): void => {
    ctaScale.value = withTiming(0.97, { duration: 120 });
  };
  const handlePressOut = (): void => {
    ctaScale.value = withTiming(1, { duration: 160 });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(360)}>
          <Text style={styles.eyebrow}>Palette test</Text>
          <Text style={styles.question}>Which one feels right?</Text>
          <Text style={styles.subtext}>
            {active.name} — {active.vibe}
          </Text>
        </Animated.View>

        {/* Live mockup of the actual onboarding "curiosity" screen, re-skinned
            with whatever palette is currently selected below. */}
        <Animated.View
          key={active.name}
          entering={FadeInDown.duration(280)}
          style={styles.mockFrame}
        >
          <View style={styles.mockProgressTrack}>
            <View style={styles.mockProgressFill} />
          </View>

          <Text style={styles.mockEyebrow}>Your interests</Text>
          <Text style={styles.mockQuestion}>What are you curious about?</Text>
          <Text style={styles.mockSubtext}>
            {SAMPLE_SELECTED.length} selected — lovely range. Keep going
            whenever it feels right.
          </Text>

          <View style={styles.chipRow}>
            {SAMPLE_TOPICS.map((topic) => {
              const isSelected = SAMPLE_SELECTED.includes(topic);
              return (
                <View
                  key={topic}
                  style={[
                    styles.chip,
                    isSelected ? styles.chipSelected : styles.chipUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      isSelected
                        ? styles.chipLabelSelected
                        : styles.chipLabelUnselected,
                    ]}
                  >
                    {topic}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.mockCta}>
            <Text style={styles.mockCtaLabel}>
              Keep going · {SAMPLE_SELECTED.length}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(60)}>
          <Text style={styles.panelTitle}>All palettes</Text>
          <Text style={styles.panelHint}>
            Tap one to preview it above — grouped roughly from quiet to bold.
          </Text>
        </Animated.View>

        <View style={styles.grid}>
          {PALETTES.map((palette) => {
            const isActive = palette.name === activeName;
            return (
              <Pressable
                key={palette.name}
                onPress={() => handleSelect(palette)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.card,
                  {
                    backgroundColor: palette.colors.onboardingSurface,
                    borderColor: isActive
                      ? palette.colors.onboardingAccent
                      : "transparent",
                  },
                ]}
              >
                <View style={styles.swatches}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: palette.colors.onboardingBackground },
                    ]}
                  />
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: palette.colors.onboardingText },
                    ]}
                  />
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: palette.colors.onboardingAccent },
                    ]}
                  />
                  {isActive && (
                    <View
                      style={[
                        styles.check,
                        { backgroundColor: palette.colors.onboardingAccent },
                      ]}
                    >
                      <Text
                        style={[
                          styles.checkMark,
                          { color: palette.colors.onboardingOnAccent },
                        ]}
                      >
                        ✓
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.cardName,
                    { color: palette.colors.onboardingText },
                  ]}
                >
                  {palette.name}
                </Text>
                <Text
                  style={[
                    styles.cardVibe,
                    { color: palette.colors.onboardingTextMuted },
                  ]}
                  numberOfLines={2}
                >
                  {palette.vibe}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Animated.View
        style={styles.footer}
        entering={FadeInUp.duration(380).delay(100)}
      >
        <Animated.View style={ctaAnimatedStyle}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => Haptics.selectionAsync()}
            accessibilityRole="button"
            accessibilityLabel={`Use ${active.name}`}
            style={styles.footerCta}
          >
            <Text style={styles.footerCtaLabel}>Use {active.name}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

function createStyles(colors: (typeof PALETTES)[number]["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.onboardingBackground,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 24,
    },
    eyebrow: {
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.onboardingAccent,
      marginBottom: 12,
    },
    question: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: "700",
      color: colors.onboardingText,
      letterSpacing: -0.3,
      marginBottom: 8,
    },
    subtext: {
      fontSize: 15,
      lineHeight: 20,
      color: colors.onboardingTextMuted,
      marginBottom: 24,
    },

    // --- mini mockup of the real onboarding screen ---
    mockFrame: {
      backgroundColor: colors.onboardingSurface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.onboardingBorder,
      padding: 20,
      marginBottom: 28,
    },
    mockProgressTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.onboardingBorder,
      marginBottom: 18,
      overflow: "hidden",
    },
    mockProgressFill: {
      width: "25%",
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.onboardingAccent,
    },
    mockEyebrow: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.onboardingAccent,
      marginBottom: 8,
    },
    mockQuestion: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "700",
      color: colors.onboardingText,
      marginBottom: 6,
    },
    mockSubtext: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.onboardingTextMuted,
      marginBottom: 16,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 18,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 18,
      borderWidth: 1,
    },
    chipSelected: {
      backgroundColor: colors.onboardingAccentSoft,
      borderColor: colors.onboardingAccent,
    },
    chipUnselected: {
      backgroundColor: colors.onboardingBackground,
      borderColor: colors.onboardingBorder,
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: "600",
    },
    chipLabelSelected: {
      color: colors.onboardingAccent,
    },
    chipLabelUnselected: {
      color: colors.onboardingTextMuted,
    },
    mockCta: {
      paddingVertical: 14,
      borderRadius: 24,
      alignItems: "center",
      backgroundColor: colors.onboardingAccent,
    },
    mockCtaLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.onboardingOnAccent,
    },

    // --- palette grid ---
    panelTitle: {
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: colors.onboardingText,
      marginBottom: 4,
    },
    panelHint: {
      fontSize: 12,
      color: colors.onboardingTextMuted,
      marginBottom: 14,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    card: {
      width: "47%",
      borderWidth: 2,
      borderRadius: 16,
      padding: 12,
    },
    swatches: {
      flexDirection: "row",
      height: 44,
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 10,
    },
    swatch: {
      flex: 1,
    },
    check: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    checkMark: {
      fontSize: 11,
      fontWeight: "800",
    },
    cardName: {
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 2,
    },
    cardVibe: {
      fontSize: 11,
      lineHeight: 14,
    },

    // --- footer ---
    footer: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 20,
    },
    footerCta: {
      paddingVertical: 16,
      borderRadius: 30,
      alignItems: "center",
      backgroundColor: colors.onboardingAccent,
    },
    footerCtaLabel: {
      fontSize: 16,
      fontWeight: "600",
      letterSpacing: 0.2,
      color: colors.onboardingOnAccent,
    },
  });
}
