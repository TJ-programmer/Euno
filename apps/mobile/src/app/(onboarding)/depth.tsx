import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { OnboardingProgress } from "../../components/onboarding/OnboardingProgress";
import { useTheme } from "@/hooks/use-theme";
import { useOnboarding } from "@/contexts/onboarding";
import type { OnboardingDepth } from "@/contexts/onboarding";

type DepthOption = {
  id: OnboardingDepth;
  title: string;
  description: string;
};

const DEPTH_OPTIONS: DepthOption[] = [
  {
    id: "quick",
    title: "Quick glances",
    description: "Bite-sized ideas — keep it light.",
  },
  {
    id: "balanced",
    title: "Balanced",
    description: "A little spark, a little depth.",
  },
  {
    id: "deep",
    title: "Deep dives",
    description: "Take ideas all the way down.",
  },
];

function DepthCard({
  option,
  selected,
  onSelect,
  theme,
}: {
  option: DepthOption;
  selected: boolean;
  onSelect: (id: OnboardingDepth) => void;
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
    onSelect(option.id);
  }, [option.id, onSelect, scale]);

  return (
    <Animated.View entering={FadeInDown.duration(320)}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          accessibilityRole="radio"
          accessibilityLabel={option.title}
          accessibilityState={{ selected }}
          style={[
            styles.card,
            selected ? styles.cardSelected : styles.cardUnselected,
          ]}
        >
          <View style={styles.cardCopy}>
            <Text
              style={[styles.cardTitle, selected && styles.cardTitleSelected]}
            >
              {option.title}
            </Text>
            <Text
              style={[
                styles.cardDescription,
                selected && styles.cardDescriptionSelected,
              ]}
            >
              {option.description}
            </Text>
          </View>
          <View
            style={[
              styles.check,
              selected ? styles.checkSelected : styles.checkUnselected,
            ]}
          >
            {selected && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function DepthScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { depth: selectedDepth, setDepth: setSelectedDepth } = useOnboarding();
  const ctaOpacity = useSharedValue(0.45);

  const hasSelection = selectedDepth !== null;

  const handleSelect = useCallback(
    (id: OnboardingDepth): void => {
      setSelectedDepth((current) => (current === id ? null : id));
      ctaOpacity.value = withTiming(1, { duration: 200 });
    },
    [ctaOpacity, setSelectedDepth]
  );

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(360)}>
          <OnboardingProgress position={3} total={4} />
          <Text style={styles.eyebrow}>Your depth</Text>
          <Text style={styles.title}>
            How deep do you{"\n"}
            want to go?
          </Text>
          <Text style={styles.subtext}>
            Euno matches the room you give yourself.
          </Text>
        </Animated.View>

        <View style={styles.options}>
          {DEPTH_OPTIONS.map((option) => (
            <DepthCard
              key={option.id}
              option={option}
              selected={selectedDepth === option.id}
              onSelect={handleSelect}
              theme={theme}
            />
          ))}
        </View>

        <Animated.View
          style={[styles.buttonWrap, ctaAnimatedStyle]}
          entering={FadeInUp.duration(380).delay(120)}
        >
          <Pressable
            style={[
              styles.button,
              hasSelection ? styles.buttonReady : styles.buttonMuted,
            ]}
            disabled={!hasSelection}
            onPress={() => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              ).catch(() => {});
              router.push({
                pathname: "/(onboarding)/moment",
                params: {
                  message: "Perfect.",
                  subtext: "Your curiosity has a shape — let's keep it close.",
                  next: "/(onboarding)/auth",
                },
              });
            }}
          >
            <Text
              style={[
                styles.buttonText,
                hasSelection ? styles.buttonTextReady : styles.buttonTextMuted,
              ]}
            >
              Continue
            </Text>
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
      marginBottom: 32,
    },
    options: {
      gap: 12,
    },
    buttonWrap: {
      marginTop: "auto",
      paddingTop: 24,
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
    cardCopy: {
      flex: 1,
      paddingRight: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.onboardingText,
      marginBottom: 3,
    },
    cardTitleSelected: {
      color: theme.onboardingOnAccent,
    },
    cardDescription: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.onboardingTextMuted,
    },
    cardDescriptionSelected: {
      color: theme.onboardingOnAccent,
      opacity: 0.85,
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