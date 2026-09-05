import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";

export type CuriosityTopic = {
  id: string;
  label: string;
};

export type CuriosityTopicsProps = {
  selectedTopics: string[];
  onToggleTopic: (topicId: string) => void;
};

export const TOPICS: CuriosityTopic[] = [
  { id: "artificial-intelligence", label: "Artificial Intelligence" },
  { id: "technology", label: "Technology" },
  { id: "psychology", label: "Psychology" },
  { id: "philosophy", label: "Philosophy" },
  { id: "business", label: "Business" },
  { id: "startups", label: "Startups" },
  { id: "science", label: "Science" },
  { id: "space", label: "Space" },
  { id: "design", label: "Design" },
  { id: "creativity", label: "Creativity" },
  { id: "music", label: "Music" },
  { id: "cinema", label: "Cinema" },
  { id: "writing", label: "Writing" },
  { id: "photography", label: "Photography" },
  { id: "history", label: "History" },
  { id: "economics", label: "Economics" },
  { id: "finance", label: "Finance" },
  { id: "health", label: "Health" },
  { id: "fitness", label: "Fitness" },
  { id: "food", label: "Food" },
  { id: "travel", label: "Travel" },
  { id: "nature", label: "Nature" },
  { id: "culture", label: "Culture" },
  { id: "society", label: "Society" },
  { id: "relationships", label: "Relationships" },
  { id: "personal-growth", label: "Personal Growth" },
  { id: "programming", label: "Programming" },
  { id: "mathematics", label: "Mathematics" },
  { id: "games", label: "Games" },
  { id: "human-behavior", label: "Human Behavior" },
];

const INITIAL_VISIBLE_COUNT = 10;

function TopicChip({
  topic,
  selected,
  onToggle,
  theme,
}: {
  topic: CuriosityTopic;
  selected: boolean;
  onToggle: (topicId: string) => void;
  theme: ReturnType<typeof useTheme>;
}): React.JSX.Element {
  const styles = useMemo(() => createChipStyles(theme), [theme]);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback((): void => {
    Haptics.selectionAsync();
    scale.value = withTiming(1.04, { duration: 90 }, () => {
      scale.value = withTiming(1, { duration: 160 });
    });
    onToggle(topic.id);
  }, [onToggle, scale, topic.id]);

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={topic.label}
          accessibilityState={{ selected }}
          style={[
            styles.chip,
            selected ? styles.chipSelected : styles.chipUnselected,
          ]}
        >
          <Text
            style={[styles.chipLabel, selected && styles.chipLabelSelected]}
          >
            {selected ? `✓  ${topic.label}` : topic.label}
          </Text>
        </Pressable>
        </Animated.View>
    </Animated.View>
  );
}

export function CuriosityTopics({
  selectedTopics,
  onToggleTopic,
}: CuriosityTopicsProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleTopics = isExpanded
    ? TOPICS
    : TOPICS.slice(0, INITIAL_VISIBLE_COUNT);

  const handleToggleExpand = useCallback((): void => {
    Haptics.selectionAsync();
    setIsExpanded((current) => !current);
  }, []);

  return (
    <View>
      <Animated.View style={styles.grid} layout={LinearTransition.duration(260)}>
        {visibleTopics.map((topic) => (
          <TopicChip
            key={topic.id}
            topic={topic}
            selected={selectedTopics.includes(topic.id)}
            onToggle={onToggleTopic}
            theme={theme}
          />
        ))}
      </Animated.View>

      {!isExpanded && (
        <Pressable
          onPress={handleToggleExpand}
          accessibilityRole="button"
          accessibilityLabel="Explore all topics"
          style={styles.exploreAll}
        >
          <Text style={styles.exploreAllLabel}>
            Explore all {TOPICS.length} topics
            <Text style={styles.exploreAllCount}> · 20 more</Text>
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    exploreAll: {
      marginTop: 24,
      alignSelf: "flex-start",
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: theme.onboardingBorder,
      backgroundColor: theme.onboardingSurface,
    },
    exploreAllLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.onboardingText,
    },
    exploreAllCount: {
      fontWeight: "400",
      color: theme.onboardingTextMuted,
    },
  });
}

function createChipStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 100,
      borderWidth: 1,
    },
    chipUnselected: {
      backgroundColor: theme.onboardingSurface,
      borderColor: theme.onboardingBorder,
    },
    chipSelected: {
      backgroundColor: theme.onboardingAccent,
      borderColor: theme.onboardingAccent,
    },
    chipLabel: {
      fontSize: 15,
      color: theme.onboardingText,
    },
    chipLabelSelected: {
      color: theme.onboardingOnAccent,
      fontWeight: "600",
    },
  });
}