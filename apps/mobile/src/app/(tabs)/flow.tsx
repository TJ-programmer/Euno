/**
 * Flow — src/app/(tabs)/flow.tsx
 *
 * A cinematic, editorial curiosity feed. Cards fill the entire screen
 * edge-to-edge (no visible card frame, borders, or seams). Vertical
 * scrolling uses a native paged FlatList — the same mechanism behind
 * Instagram Reels / YouTube Shorts — so momentum, snapping, and
 * interrupted swipes all feel native instead of hand-rolled and jumpy.
 * Swiping left (or tapping "Why?") dives deeper into the current card;
 * swiping left again once expanded advances to the next connected
 * discovery. Swiping right backs out of an expanded card.
 *
 * The horizontal "go deeper" / "back" swipe now tracks the finger live
 * (rubber-banded drag + a slight tilt), flings the rest of the way once
 * a swipe is committed, and cross-fades the card's content directionally
 * (old content exits toward the swipe direction, new content enters from
 * the opposite side) instead of popping instantly. A layout transition
 * smooths the height change when the description is swapped for the
 * expanded "Why" block.
 *
 * Reuses the existing Euno theme system (Colors / Fonts / Spacing) and
 * follows the same visual language as the Home screen (serif headlines,
 * glass surfaces, accent-tinted UI).
 *
 * Dependencies used beyond what was listed as "existing stack":
 *   - expo-linear-gradient  (atmospheric gradients, card scrims, glow)
 *   - expo-haptics          (tactile feedback on dive/expand/collapse)
 *   - react-native-gesture-handler (Gesture.Pan / GestureDetector, for the
 *     horizontal "go deeper" swipe only — vertical paging is native)
 *   - react-native-safe-area-context (safe area insets)
 * These are standard Expo/RN ecosystem packages. If any aren't installed:
 *   npx expo install expo-linear-gradient expo-haptics react-native-gesture-handler react-native-safe-area-context
 *
 * The existing bottom navigation is NOT touched or recreated here — this
 * file only renders the Flow tab's content, on top of it.
 *
 * DATA: all content comes from `discoveryService` (src/services/discoveryService.ts).
 * It's mock data today; swapping in a real backend only means editing that
 * one file — nothing here needs to change.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  useColorScheme,
  useWindowDimensions,
  type FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  FadeInUp,
  FadeOut,
  LinearTransition,
  SlideInRight,
  SlideOutLeft,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { SlidersHorizontal } from "lucide-react-native";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import { discoveryService, type Discovery } from "@/services/discoveryService";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

type Theme = typeof Colors.light;

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const TOPIC_FILTERS = ["All", "Technology", "Psychology", "Science", "Nature"] as const;

/** Distance threshold to commit to a horizontal "go deeper" / "back" swipe. */
const HORIZONTAL_SWIPE_THRESHOLD = 70;
/** Velocity threshold to commit to a fast horizontal flick. */
const HORIZONTAL_VELOCITY_THRESHOLD = 650;
/** Rough reserved space for the existing bottom tab bar — tune to match its real height. */
const BOTTOM_NAV_SPACE = 88;

// ─────────────────────────────────────────────────────────────────────────
// Small building blocks
// ─────────────────────────────────────────────────────────────────────────

function FlowHeader({
  theme,
  onFilterPress,
}: {
  theme: Theme;
  onFilterPress: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <Text style={[styles.brand, { color: theme.text, fontFamily: Fonts.serif }]}>
          ✦ Flow
        </Text>
        <Pressable
          onPress={onFilterPress}
          hitSlop={10}
          style={({ pressed }) => [
            styles.filterButton,
            { borderColor: "rgba(255,255,255,0.25)" },
            pressed && styles.pressedSubtle,
          ]}
        >
          <SlidersHorizontal size={16} color={theme.textSecondary} />
        </Pressable>
      </View>
      <Text style={[styles.headerSubtitle, { color: theme.textSecondary, fontFamily: Fonts.sans }]}>
        Follow your curiosity.
      </Text>
    </View>
  );
}

function FlowTopics({
  theme,
  active,
  onSelect,
}: {
  theme: Theme;
  active: string;
  onSelect: (topic: string) => void;
}) {
  return (
    <View style={styles.topicsRow}>
      {TOPIC_FILTERS.map((topic) => {
        const isActive = topic === active;
        return (
          <Pressable
            key={topic}
            onPress={() => onSelect(topic)}
            style={({ pressed }) => [pressed && styles.pressedSubtle]}
          >
            {isActive ? (
              <LinearGradient
                colors={[theme.onboardingAccent, theme.onboardingAccent + "99"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.topicChip}
              >
                <Text style={[styles.topicChipText, { color: theme.background, fontFamily: Fonts.sans }]}>
                  {topic}
                </Text>
              </LinearGradient>
            ) : (
              <View style={[styles.topicChip, styles.topicChipInactive, { borderColor: "rgba(255,255,255,0.25)" }]}>
                <Text style={[styles.topicChipText, { color: theme.textSecondary, fontFamily: Fonts.sans }]}>
                  {topic}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** The tactile "✦ Why? →" pill — same action as swiping right. */
function CuriosityAction({ theme, onPress }: { theme: Theme; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.whyPill,
        { borderColor: "rgba(255,255,255,0.3)" },
        pressed && styles.whyPillPressed,
      ]}
    >
      <Text style={[styles.whyPillText, { color: theme.text, fontFamily: Fonts.sans }]}>✦ Why? →</Text>
    </Pressable>
  );
}

/** Subtle, editorial — not quiz buttons. All three currently advance to the next discovery (see branches note on the Discovery type). */
function CuriosityBranches({
  theme,
  branches,
  onSelect,
}: {
  theme: Theme;
  branches: NonNullable<Discovery["branches"]>;
  onSelect: () => void;
}) {
  const items: { key: "why" | "how" | "whatIf"; label: string }[] = [
    { key: "why", label: "Why?" },
    { key: "how", label: "How?" },
    { key: "whatIf", label: "What if?" },
  ];

  return (
    <View style={styles.branchRow}>
      {items.map((item, i) => (
        <React.Fragment key={item.key}>
          <Pressable onPress={onSelect} style={({ pressed }) => [pressed && styles.pressedSubtle]}>
            <Text style={[styles.branchText, { color: theme.text, fontFamily: Fonts.sans }]}>{item.label}</Text>
          </Pressable>
          {i < items.length - 1 && (
            <Text style={[styles.branchDivider, { color: theme.textSecondary }]}>·</Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

/**
 * Normal (non-connection) card content: meta → title → description/expansion → action.
 * Wrapped in an Animated.View with a `layout` transition so the reflow
 * caused by swapping the description for the expanded block (this whole
 * block is bottom-anchored via `justifyContent: "flex-end"`) animates
 * smoothly instead of jumping. The description and expanded block each
 * get directional enter/exit animations so the swap reads as one
 * continuous motion in the direction of the swipe, rather than a pop.
 */
function DiscoveryCardBody({
  theme,
  discovery,
  expanded,
  onToggleExpand,
  onAdvance,
}: {
  theme: Theme;
  discovery: Discovery;
  expanded: boolean;
  onToggleExpand: () => void;
  onAdvance: () => void;
}) {
  return (
    <Animated.View style={styles.cardContent} layout={LinearTransition.duration(220).easing(Easing.out(Easing.cubic))}>
      <Animated.Text
        entering={FadeInUp.delay(40).duration(360)}
        style={[styles.cardMeta, { color: theme.textSecondary, fontFamily: Fonts.sans }]}
      >
        {discovery.category.toUpperCase()} · {discovery.readTime}
      </Animated.Text>

      <Animated.Text
        entering={FadeInUp.delay(110).duration(420)}
        style={[styles.cardTitle, { color: theme.text, fontFamily: Fonts.serif }]}
      >
        {discovery.title}
      </Animated.Text>

      {!expanded && (
        <Animated.Text
          key="description"
          entering={FadeInUp.delay(180).duration(420)}
          exiting={SlideOutLeft.duration(180).easing(Easing.in(Easing.cubic))}
          style={[styles.cardDescription, { color: theme.textSecondary, fontFamily: Fonts.sans }]}
        >
          {discovery.description}
        </Animated.Text>
      )}

      {expanded && discovery.question && (
        <Animated.View
          key="expanded"
          entering={SlideInRight.duration(260).easing(Easing.out(Easing.cubic))}
          exiting={FadeOut.duration(120)}
          style={styles.expandedBlock}
        >
          <Text style={[styles.expandedLabel, { color: theme.onboardingAccent, fontFamily: Fonts.sans }]}>
            Why
          </Text>
          <Text style={[styles.expandedText, { color: theme.text, fontFamily: Fonts.sans }]}>
            {discovery.question}
          </Text>
        </Animated.View>
      )}

      <Animated.View
        entering={FadeInUp.delay(expanded ? 70 : 250).duration(400)}
        style={styles.actionRow}
      >
        {!expanded ? (
          <CuriosityAction theme={theme} onPress={onToggleExpand} />
        ) : discovery.branches ? (
          <CuriosityBranches theme={theme} branches={discovery.branches} onSelect={onAdvance} />
        ) : (
          <Pressable
            onPress={onAdvance}
            style={({ pressed }) => [styles.exploreDeeper, pressed && styles.pressedSubtle]}
          >
            <Text style={[styles.exploreDeeperText, { color: theme.text, fontFamily: Fonts.sans }]}>
              Explore deeper →
            </Text>
          </Pressable>
        )}
      </Animated.View>

      {!expanded && (
        <Text style={[styles.swipeHint, { color: theme.textSecondary, fontFamily: Fonts.sans }]}>
          swipe left for more ✦
        </Text>
      )}
    </Animated.View>
  );
}

/** Special "Euno noticed a connection" layout. */
function ConnectionContent({
  theme,
  discovery,
  onAdvance,
}: {
  theme: Theme;
  discovery: Discovery;
  onAdvance: () => void;
}) {
  const tags = discovery.connectionTags ?? ["Idea A", "Idea B"];
  return (
    <View style={styles.cardContent}>
      <Animated.Text
        entering={FadeInUp.delay(40).duration(360)}
        style={[styles.cardMeta, { color: theme.onboardingAccent, fontFamily: Fonts.sans }]}
      >
        ✦ A CONNECTION
      </Animated.Text>

      <Animated.Text
        entering={FadeInUp.delay(100).duration(400)}
        style={[styles.connectionLead, { color: theme.textSecondary, fontFamily: Fonts.sans }]}
      >
        You were curious about
      </Animated.Text>

      <Animated.View entering={FadeInUp.delay(160).duration(400)} style={styles.connectionTagsRow}>
        <Text style={[styles.connectionTag, { color: theme.text, fontFamily: Fonts.serif }]}>{tags[0]}</Text>
        <Text style={[styles.connectionPlus, { color: theme.textSecondary }]}>+</Text>
        <Text style={[styles.connectionTag, { color: theme.text, fontFamily: Fonts.serif }]}>{tags[1]}</Text>
      </Animated.View>

      <Animated.Text
        entering={FadeInUp.delay(230).duration(420)}
        style={[styles.cardDescription, { color: theme.textSecondary, fontFamily: Fonts.sans }]}
      >
        {discovery.description}
      </Animated.Text>

      <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.actionRow}>
        <Pressable
          onPress={onAdvance}
          style={({ pressed }) => [styles.exploreDeeper, pressed && styles.pressedSubtle]}
        >
          <Text style={[styles.exploreDeeperText, { color: theme.text, fontFamily: Fonts.sans }]}>
            Continue →
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * One page in the feed. Sized to fill the screen exactly (so FlatList's
 * native paging can snap cleanly, the way Reels/Shorts do). Owns:
 *  - a subtle scroll-driven scale/opacity ("focus") tied to `scrollY`,
 *    computed on the UI thread so it stays glued to the native scroll
 *    with zero bridge lag,
 *  - a live-tracked horizontal drag (`dragX`) that rubber-bands under the
 *    finger with a slight tilt, then either springs back or flings the
 *    rest of the way and commits — this is what removes the "friction"
 *    feeling, since the card now visibly responds the instant you touch
 *    it instead of only reacting once a threshold is crossed, and
 *  - the horizontal "go deeper" / "back" gesture, which is deliberately
 *    scoped to this single item rather than the whole list so it never
 *    fights the vertical native pager.
 */
function FlowCardItem({
  discovery,
  index,
  scrollY,
  dimensionStyle,
  theme,
  expanded,
  onToggleExpand,
  onAdvance,
}: {
  discovery: Discovery;
  index: number;
  scrollY: ReturnType<typeof useSharedValue<number>>;
  dimensionStyle: { width: number; height: number };
  theme: Theme;
  expanded: boolean;
  /** Toggles this card's expanded state (used by the "Why?" pill and both swipe directions). */
  onToggleExpand: () => void;
  /** Always moves to the next discovery (branch pills, "Explore deeper", connection "Continue"). */
  onAdvance: () => void;
}) {
  const pulse = useSharedValue(1);
  const dragX = useSharedValue(0);
  const { width, height } = dimensionStyle;
  const gradientColors = discovery.gradient ?? (["#171227", "#05040c"] as [string, string]);

  const pulseFeedback = useCallback(() => {
    pulse.value = withSequence(withTiming(1.015, { duration: 90 }), withTiming(1, { duration: 160 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipe left (once the fling-to-commit animation finishes): expand if
  // collapsed; if already expanded, dive into the next discovery. Haptics
  // and the "commit" motion now live in the gesture's onEnd, so this stays
  // a plain state transition.
  const handleDeeperGesture = useCallback(() => {
    if (!expanded) {
      onToggleExpand();
    } else {
      onAdvance();
    }
  }, [expanded, onToggleExpand, onAdvance]);

  // Swipe right (once committed): back out of an expanded card. No-op when
  // already collapsed.
  const handleBackGesture = useCallback(() => {
    if (!expanded) return;
    onToggleExpand();
  }, [expanded, onToggleExpand]);

  const handleToggleExpandTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    pulseFeedback();
    onToggleExpand();
  }, [onToggleExpand, pulseFeedback]);

  // Horizontal drag → go deeper (right) or back (left). Native vertical
  // paging on the parent FlatList handles up/down, so this gesture fails
  // fast on vertical movement and never competes with the scroll view.
  //
  // onUpdate tracks the finger live with rubber-band resistance (heavier
  // resistance going "back" when there's nothing to back out of, so it
  // doesn't feel like a dead swipe). onEnd either springs back to center
  // (uncommitted) or flings the card the rest of the way off-screen before
  // triggering the state change — so the content swap always happens
  // mid-motion instead of as an abrupt pop.
  const horizontalPan = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          // Deeper is now right-to-left (negative translationX gets full
          // travel); dragging right (backing out) is resisted, and more so
          // when collapsed since there's nothing to back out of.
          const raw = e.translationX;
          dragX.value = raw <= 0 ? raw * 0.55 : raw * (expanded ? 0.55 : 0.15);
        })
        .onEnd((e) => {
          const passedDistance = Math.abs(e.translationX) > HORIZONTAL_SWIPE_THRESHOLD;
          const passedVelocity = Math.abs(e.velocityX) > HORIZONTAL_VELOCITY_THRESHOLD;
          const committed = passedDistance || passedVelocity;

          if (committed && e.translationX < 0) {
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
            dragX.value = withTiming(-width * 0.35, { duration: 140 }, (finished) => {
              dragX.value = 0;
              if (finished) runOnJS(handleDeeperGesture)();
            });
          } else if (committed) {
            runOnJS(Haptics.selectionAsync)();
            dragX.value = withTiming(width * 0.35, { duration: 120 }, (finished) => {
              dragX.value = 0;
              if (finished) runOnJS(handleBackGesture)();
            });
          } else {
            dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        }),
    [handleDeeperGesture, handleBackGesture, expanded, width, dragX]
  );

  // Scroll-linked "focus" effect (scale/opacity vs. neighbouring pages)
  // combined with the live drag transform (translateX + a slight tilt,
  // fading slightly as it travels) — driven straight off shared values on
  // the UI thread, so both track the finger/momentum with no extra
  // latency (the actual smoothness of vertical paging comes from the
  // FlatList's own native paging; this is polish on top of it).
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * height, index * height, (index + 1) * height];
    const scale = interpolate(scrollY.value, inputRange, [0.94, 1, 0.94], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP);

    const dragProgress = interpolate(dragX.value, [-width, 0, width], [-1, 0, 1], Extrapolation.CLAMP);
    const dragFade = interpolate(Math.abs(dragX.value), [0, width * 0.35], [1, 0.9], Extrapolation.CLAMP);

    return {
      transform: [
        { translateX: dragX.value },
        { rotate: `${dragProgress * 4}deg` },
        { scale: scale * pulse.value },
      ],
      opacity: opacity * dragFade,
    };
  });

  return (
    <GestureDetector gesture={horizontalPan}>
      <Animated.View style={[styles.card, dimensionStyle, animatedStyle]}>
        <View style={StyleSheet.absoluteFill}>
          {discovery.image ? (
            <>
              <Image source={{ uri: discovery.image }} style={StyleSheet.absoluteFillObject} />
              <LinearGradient
                colors={["transparent", "rgba(5,4,12,0.55)", "rgba(5,4,12,0.92)"]}
                style={StyleSheet.absoluteFillObject}
              />
            </>
          ) : (
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <LinearGradient
            colors={["rgba(255,255,255,0.07)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.6 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Top scrim so the floating header stays legible over any image/gradient. */}
          <LinearGradient
            colors={["rgba(4,3,10,0.65)", "transparent"]}
            style={styles.topScrim}
            pointerEvents="none"
          />
        </View>

        {discovery.isConnection ? (
          <ConnectionContent theme={theme} discovery={discovery} onAdvance={onAdvance} />
        ) : (
          <DiscoveryCardBody
            theme={theme}
            discovery={discovery}
            expanded={expanded}
            onToggleExpand={handleToggleExpandTap}
            onAdvance={onAdvance}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────

export default function FlowScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [deck, setDeck] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const listRef = useRef<FlatList<Discovery>>(null);
  const scrollY = useSharedValue(0);
  const activeIndexRef = useRef(0);

  // Load the deck through the swappable data service whenever the topic changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    discoveryService
      .getDiscoveries(activeFilter)
      .then((items) => {
        if (cancelled) return;
        setDeck(items);
        setActiveIndex(0);
        setExpandedId(null);
        scrollY.value = 0;
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      })
      .catch(() => {
        if (!cancelled) setDeck([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  // Full-bleed: each page fills the entire screen, no margins, no border.
  const dimensionStyle = useMemo(() => ({ width, height }), [width, height]);

  // Drives FlowCardItem's scroll-linked scale/opacity, on the UI thread.
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  /** Programmatically page to a given index — used by the "deeper"/"advance" actions. */
  const scrollToIndex = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= deck.length) return;
      listRef.current?.scrollToOffset({ offset: idx * height, animated: true });
    },
    [deck.length, height]
  );

  // Keep activeIndex in sync once native momentum scrolling settles, and
  // collapse any expanded card left behind when the page actually changes
  // (so returning to it later starts fresh — same as the old behaviour).
  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (height <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.y / height);
      if (idx !== activeIndexRef.current) {
        setExpandedId(null);
      }
      activeIndexRef.current = idx;
      setActiveIndex(idx);
    },
    [height]
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  /** Always moves forward: branch pills, "Explore deeper", connection "Continue", and swipe-right-while-expanded. */
  const handleAdvance = useCallback(
    (index: number) => {
      setExpandedId(null);
      scrollToIndex(index + 1);
    },
    [scrollToIndex]
  );

  const handleFilterPress = useCallback(() => {
    // TODO: wire to a real filter sheet. For now, cycle through the topic list.
    const idx = TOPIC_FILTERS.indexOf(activeFilter as (typeof TOPIC_FILTERS)[number]);
    const nextTopic = TOPIC_FILTERS[(idx + 1) % TOPIC_FILTERS.length];
    setActiveFilter(nextTopic);
  }, [activeFilter]);

  const renderItem = useCallback(
    ({ item, index }: { item: Discovery; index: number }) => (
      <FlowCardItem
        discovery={item}
        index={index}
        scrollY={scrollY}
        dimensionStyle={dimensionStyle}
        theme={theme}
        expanded={expandedId === item.id}
        onToggleExpand={() => handleToggleExpand(item.id)}
        onAdvance={() => handleAdvance(index)}
      />
    ),
    [scrollY, dimensionStyle, theme, expandedId, handleToggleExpand, handleAdvance]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Discovery> | null | undefined, index: number) => ({
      length: height,
      offset: height * index,
      index,
    }),
    [height]
  );

  return (
    <GestureHandlerRootView style={styles.flex}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Animated.FlatList
          ref={listRef}
          data={deck}
          keyExtractor={(item: Discovery) => item.id}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          extraData={expandedId}
          pagingEnabled
          disableIntervalMomentum
          decelerationRate="fast"
          snapToInterval={height}
          snapToAlignment="start"
          bounces={false}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumEnd}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          removeClippedSubviews
          style={StyleSheet.absoluteFill}
          ListEmptyComponent={
            <View style={[styles.card, dimensionStyle, styles.emptyCard]}>
              <Text style={[styles.emptyState, { color: theme.textSecondary, fontFamily: Fonts.sans }]}>
                {loading ? "Loading…" : "Nothing here yet — try another topic."}
              </Text>
            </View>
          }
        />

        {/* Header floats above the feed; box-none so scroll/swipe gestures pass through empty areas. */}
        <View
          style={[styles.headerFloating, { paddingTop: insets.top + Spacing.two }]}
          pointerEvents="box-none"
        >
          <FlowHeader theme={theme} onFilterPress={handleFilterPress} />
          <FlowTopics theme={theme} active={activeFilter} onSelect={setActiveFilter} />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, overflow: "hidden" },

  // Header now floats over the full-bleed feed instead of pushing it down.
  headerFloating: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 24, fontWeight: "600" },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Topic chips
  topicsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  topicChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: 999,
  },
  topicChipInactive: {
    borderWidth: 1,
  },
  topicChipText: { fontSize: 13, fontWeight: "600" },

  emptyCard: { alignItems: "center", justifyContent: "center" },
  emptyState: { fontSize: 14 },

  // Card — edge to edge, no border/radius, so consecutive pages blend
  // into one continuous surface instead of showing a frame or seam.
  card: {
    overflow: "hidden",
  },
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },

  cardContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.five,
    paddingBottom: Spacing.five + BOTTOM_NAV_SPACE,
  },
  cardMeta: { fontSize: 12, fontWeight: "600", letterSpacing: 0.6, marginBottom: Spacing.two },
  cardTitle: { fontSize: 30, lineHeight: 37, fontWeight: "600", marginBottom: Spacing.three },
  cardDescription: { fontSize: 15, lineHeight: 22, marginBottom: Spacing.four },
  swipeHint: { fontSize: 12, marginTop: Spacing.three, opacity: 0.6 },

  expandedBlock: { marginBottom: Spacing.four },
  expandedLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 6 },
  expandedText: { fontSize: 15, lineHeight: 22 },

  actionRow: { flexDirection: "row", alignItems: "center" },

  whyPill: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  whyPillPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  whyPillText: { fontSize: 14, fontWeight: "600" },

  branchRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  branchText: { fontSize: 14, fontWeight: "600" },
  branchDivider: { fontSize: 14 },

  exploreDeeper: { alignSelf: "flex-start", paddingVertical: 6 },
  exploreDeeperText: { fontSize: 14, fontWeight: "600" },

  pressedSubtle: { opacity: 0.7 },

  // Connection card
  connectionLead: { fontSize: 14, marginBottom: Spacing.two },
  connectionTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  connectionTag: { fontSize: 24, fontWeight: "600" },
  connectionPlus: { fontSize: 16 },
});
