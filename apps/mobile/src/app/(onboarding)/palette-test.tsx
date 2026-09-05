import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { PALETTES, type Palette } from "@/constants/palettes";

export default function PaletteTestScreen() {
  const [activeName, setActiveName] = useState(PALETTES[0].name);
  const active =
    PALETTES.find((palette) => palette.name === activeName) ?? PALETTES[0];
  const colors = active.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSelect = (palette: Palette): void => {
    Haptics.selectionAsync();
    setActiveName(palette.name);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>euno</Text>
        <Text style={styles.brandLabel}>Palette explorer</Text>
      </View>

      <View style={styles.preview}>
        <Text style={styles.eyebrow}>Curiosity, made meaningful</Text>
        <Text style={styles.headline}>
          Let’s find out{"\n"}what pulls you in
        </Text>
        <Text style={styles.body}>
          A place designed to make your time feel meaningful, not just make it
          disappear.
        </Text>

        <Pressable
          onPressIn={() => Haptics.selectionAsync()}
          style={({ pressed }) => [
            styles.cta,
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaLabel}>Start exploring</Text>
          <Text style={styles.ctaArrow}>→</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Choose the feeling</Text>
          <Text style={styles.panelHint}>Tap a palette to preview it live</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paletteRow}
        >
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
                  isActive && { borderColor: palette.colors.onboardingAccent },
                ]}
              >
                <View style={styles.swatches}>
                  <View style={[styles.swatch, { backgroundColor: palette.colors.onboardingBackground }]} />
                  <View style={[styles.swatch, { backgroundColor: palette.colors.onboardingText }]} />
                  <View style={[styles.swatch, { backgroundColor: palette.colors.onboardingAccent }]} />
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
                    isActive && { color: colors.onboardingText, fontWeight: "700" },
                  ]}
                >
                  {palette.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: (typeof PALETTES)[number]["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.onboardingBackground,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      paddingHorizontal: 28,
      paddingTop: 20,
    },
    brand: {
      fontSize: 20,
      fontWeight: "700",
      letterSpacing: -0.4,
      color: colors.onboardingText,
    },
    brandLabel: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.onboardingTextMuted,
    },
    preview: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    eyebrow: {
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.onboardingAccent,
      marginBottom: 16,
    },
    headline: {
      fontSize: 40,
      lineHeight: 48,
      fontWeight: "700",
      letterSpacing: -0.8,
      color: colors.onboardingText,
      marginBottom: 20,
    },
    body: {
      fontSize: 17,
      lineHeight: 26,
      color: colors.onboardingTextMuted,
      maxWidth: 360,
    },
    cta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      alignSelf: "flex-start",
      paddingVertical: 17,
      paddingHorizontal: 28,
      borderRadius: 30,
      backgroundColor: colors.onboardingAccent,
      marginTop: 36,
    },
    ctaLabel: {
      fontSize: 16,
      fontWeight: "600",
      letterSpacing: 0.2,
      color: colors.onboardingOnAccent,
    },
    ctaArrow: {
      fontSize: 18,
      color: colors.onboardingOnAccent,
    },
    panel: {
      paddingHorizontal: 24,
      paddingTop: 18,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: colors.onboardingBorder,
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    panelTitle: {
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: colors.onboardingText,
    },
    panelHint: {
      fontSize: 12,
      color: colors.onboardingTextMuted,
    },
    paletteRow: {
      gap: 12,
      paddingRight: 8,
    },
    card: {
      borderWidth: 2,
      borderColor: "transparent",
      borderRadius: 14,
      padding: 4,
    },
    swatches: {
      flexDirection: "row",
      width: 104,
      height: 52,
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 8,
    },
    swatch: {
      flex: 1,
    },
    check: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    checkMark: {
      fontSize: 12,
      fontWeight: "800",
    },
    cardName: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.onboardingTextMuted,
    },
  });
}