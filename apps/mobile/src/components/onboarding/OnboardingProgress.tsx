import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";

type OnboardingProgressProps = {
  position: number;
  total?: number;
};

function ProgressDot({
  active,
  completed,
  accent,
  muted,
}: {
  active: boolean;
  completed: boolean;
  accent: string;
  muted: string;
}) {
  const width = useSharedValue(8);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    width.value = withTiming(active ? 26 : 8, { duration: 280 });
    opacity.value = withTiming(
      active ? 1 : completed ? 0.7 : 0.4,
      { duration: 280 }
    );
  }, [active, completed, width, opacity]);

  const color = active || completed ? accent : muted;

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color }, animatedStyle]}
    />
  );
}

export function OnboardingProgress({
  position,
  total = 4,
}: OnboardingProgressProps) {
  const theme = useTheme();

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: position + 1 }}
    >
      {Array.from({ length: total }).map((_, index) => (
        <ProgressDot
          key={index}
          active={index === position}
          completed={index < position}
          accent={theme.onboardingAccent}
          muted={theme.onboardingBorder}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});