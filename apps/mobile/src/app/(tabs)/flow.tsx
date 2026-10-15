/**
 * Flow — src/app/(tabs)/flow.tsx
 *
 * Reels/Shorts × slideshow × flip-cards:
 *  - Vertical: native paged FlatList, one discovery per page.
 *  - Inside a discovery: up to 7 steps. The backend model is
 *    Hook → Tension → Reveal → Why → Surprise → Connection → Takeaway, but the
 *    reader sees a curiosity journey instead:
 *    Curious? → But wait… → Turns out → Here's why → Plot twist → Zoom out →
 *    Remember this.
 *    Tap right / swipe left = next step, tap left / swipe right = previous.
 *  - After the last step: the "next rabbit hole" prompt advances to the next
 *    discovery.
 *  - Background = UI template chosen from the DB label (see labelTemplates.tsx),
 *    dimmed by a scrim so the text always dominates.
 *
 * Card surfaces are always dark, so text colours are fixed light values.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { SlidersHorizontal } from "lucide-react-native";

import { Fonts, Spacing } from "@/constants/theme";
import {
  discoveryService,
  type Discovery,
  type FlowStep,
  type FlowStepKey,
} from "@/services/discoveryService";
import {
  LabelBackdrop,
  resolveTemplate,
  withAlpha,
  type LabelTemplate,
} from "@/components/flow/labelTemplates";

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const TOPIC_FILTERS = ["All", "Technology", "Psychology", "Science", "Nature", "Health"] as const;

const TEXT = "#FFFFFF";
const TEXT_DIM = "rgba(255,255,255,0.74)";
const TEXT_FAINT = "rgba(255,255,255,0.5)";
const HAIRLINE = "rgba(255,255,255,0.22)";

/** Soft shadow so text stays crisp over any animated backdrop. */
const SHADOW = {
  textShadowColor: "rgba(0,0,0,0.5)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 14,
} as const;

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 600;
/** Rough reserved space for the existing bottom tab bar — tune to match its real height. */
const BOTTOM_NAV_SPACE = 88;

/**
 * UI vocabulary. The backend keys (hook, tension, reveal…) are our mental
 * model; the reader gets a curiosity journey instead.
 */
const STEP_META: Record<FlowStepKey, { eyebrow: string; glyph: string }> = {
  hook: { eyebrow: "CURIOUS?", glyph: "✦" },
  tension: { eyebrow: "BUT WAIT…", glyph: "≈" },
  reveal: { eyebrow: "TURNS OUT", glyph: "◉" },
  why: { eyebrow: "HERE'S WHY", glyph: "↳" },
  surprise: { eyebrow: "PLOT TWIST", glyph: "✺" },
  connection: { eyebrow: "ZOOM OUT", glyph: "∞" },
  takeaway: { eyebrow: "REMEMBER THIS", glyph: "✓" },
};

// ─────────────────────────────────────────────────────────────────────────
// Text helpers
// ─────────────────────────────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

/** "Statement. Question?" → big question with the statement as a lead-in. */
function splitHook(body: string): { lead: string; question: string } {
  const s = splitSentences(body);
  const last = s[s.length - 1];
  if (s.length > 1 && last.endsWith("?")) return { lead: s.slice(0, -1).join(" "), question: last };
  return { lead: "", question: body };
}

/** Scales a font size down for long text so big type still fits on screen. */
function fit(text: string, size: number, lineHeight: number) {
  const n = text.length;
  const k = n < 70 ? 1 : n < 120 ? 0.88 : n < 180 ? 0.78 : 0.68;
  return { fontSize: Math.round(size * k), lineHeight: Math.round(lineHeight * k) };
}

// ─────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────

function FlowHeader({ onFilterPress }: { onFilterPress: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <Text style={[styles.brand, { fontFamily: Fonts.serif }]}>✦ Flow</Text>
        <Pressable
          onPress={onFilterPress}
          hitSlop={10}
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressedSubtle]}
        >
          <SlidersHorizontal size={16} color={TEXT_DIM} />
        </Pressable>
      </View>
      <Text style={[styles.headerSubtitle, { fontFamily: Fonts.sans }]}>Follow your curiosity.</Text>
    </View>
  );
}

function FlowTopics({ active, onSelect }: { active: string; onSelect: (t: string) => void }) {
  return (
    <View style={styles.topicsRow}>
      {TOPIC_FILTERS.map((topic) => {
        const isActive = topic === active;
        return (
          <Pressable key={topic} onPress={() => onSelect(topic)} style={({ pressed }) => [pressed && styles.pressedSubtle]}>
            <View style={[styles.topicChip, isActive ? styles.topicChipActive : styles.topicChipInactive]}>
              <Text style={[styles.topicChipText, { color: isActive ? "#0B0814" : TEXT_DIM, fontFamily: Fonts.sans }]}>
                {topic}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step bodies — each step has its own visual treatment, text always the hero
// ─────────────────────────────────────────────────────────────────────────

function StepBody({
  step,
  index,
  total,
  template,
  claimCount,
}: {
  step: FlowStep;
  index: number;
  total: number;
  template: LabelTemplate;
  claimCount: number;
}) {
  const accent = template.accent;
  const meta = STEP_META[step.key];

  const eyebrow = (
    <View style={styles.eyebrowRow}>
      <Text style={[styles.eyebrowGlyph, { color: accent }]}>{meta.glyph}</Text>
      <Text style={[styles.eyebrowText, { color: accent, fontFamily: Fonts.sans }]}>{meta.eyebrow}</Text>
      <Text style={[styles.eyebrowCount, { fontFamily: Fonts.sans }]}>
        {index + 1}/{total}
      </Text>
    </View>
  );

  let content: React.ReactNode;

  switch (step.key) {
    case "hook": {
      const { lead, question } = splitHook(step.body);
      content = (
        <>
          {lead ? <Text style={[styles.hookLead, SHADOW, { fontFamily: Fonts.sans }]}>{lead}</Text> : null}
          <Text style={[styles.hookQuestion, SHADOW, fit(question, 46, 54), { fontFamily: Fonts.serif }]}>
            {question}
          </Text>
        </>
      );
      break;
    }

    case "tension":
      content = (
        <View style={[styles.tensionWrap, { borderLeftColor: accent }]}>
          <Text style={[styles.tensionText, SHADOW, fit(step.body, 30, 40), { fontFamily: Fonts.serif }]}>
            {step.body}
          </Text>
        </View>
      );
      break;

    case "reveal":
      content = (
        <>
          <View style={[styles.revealRule, { backgroundColor: accent }]} />
          <Text
            style={[
              styles.revealText,
              fit(step.body, 36, 47),
              { fontFamily: Fonts.serif, textShadowColor: withAlpha(accent, 0.45) },
            ]}
          >
            {step.body}
          </Text>
        </>
      );
      break;

    case "why":
      content = (
        <View style={styles.whyPanel}>
          {splitSentences(step.body).map((sentence, i) => (
            <View key={i} style={[styles.whyRow, i > 0 && { marginTop: Spacing.three }]}>
              <View style={[styles.whyDot, { borderColor: accent }]}>
                <Text style={[styles.whyDotText, { color: accent, fontFamily: Fonts.sans }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.whyText, SHADOW, { fontFamily: Fonts.sans }]}>{sentence}</Text>
            </View>
          ))}
        </View>
      );
      break;

    case "surprise":
      content = (
        <View style={[styles.surpriseCard, { borderColor: withAlpha(accent, 0.5) }]}>
          <Text style={[styles.surpriseBang, { color: withAlpha(accent, 0.09), fontFamily: Fonts.serif }]}>!</Text>
          <Text style={[styles.surpriseText, SHADOW, fit(step.body, 28, 38), { fontFamily: Fonts.serif }]}>
            {step.body}
          </Text>
        </View>
      );
      break;

    case "connection":
      content = (
        <>
          <View style={styles.nodesRow}>
            <View style={[styles.node, { backgroundColor: accent }]} />
            <View style={[styles.nodeLine, { backgroundColor: withAlpha(accent, 0.6) }]} />
            <View style={[styles.node, { borderColor: accent, borderWidth: 2 }]} />
          </View>
          <Text style={[styles.connectionText, SHADOW, fit(step.body, 26, 36), { fontFamily: Fonts.sans }]}>
            {step.body}
          </Text>
        </>
      );
      break;

    case "takeaway":
    default:
      content = (
        <LinearGradient
          colors={[withAlpha(accent, 0.28), withAlpha(accent, 0.06)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.takeawayCard, { borderColor: withAlpha(accent, 0.5) }]}
        >
          <Text style={[styles.takeawayText, SHADOW, fit(step.body, 31, 42), { fontFamily: Fonts.serif }]}>
            {step.body}
          </Text>
          {claimCount > 0 && (
            <Text style={[styles.takeawayFoot, { fontFamily: Fonts.sans }]}>
              Grounded in {claimCount} supporting {claimCount === 1 ? "claim" : "claims"}
            </Text>
          )}
        </LinearGradient>
      );
  }

  return (
    <Animated.View entering={FadeInUp.duration(320)}>
      {eyebrow}
      {content}
    </Animated.View>
  );
}

/**
 * Flip-card stage. When `step` changes the current content flips away in the
 * direction of travel, the content swaps while it's edge-on (invisible), and
 * the new step flips in from the opposite side. Kept gentle so the text, not
 * the motion, carries the moment.
 */
function StepStage({
  steps,
  step,
  template,
  claimCount,
}: {
  steps: FlowStep[];
  step: number;
  template: LabelTemplate;
  claimCount: number;
}) {
  const rot = useSharedValue(0);
  const prevStep = useRef(step);
  const [shown, setShown] = useState(step);

  useEffect(() => {
    if (step === prevStep.current) return;
    const dir = step > prevStep.current ? 1 : -1;
    prevStep.current = step;
    rot.value = withTiming(-dir, { duration: 130, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) {
        runOnJS(setShown)(step);
        rot.value = dir;
        rot.value = withTiming(0, { duration: 230, easing: Easing.out(Easing.cubic) });
      }
    });
  }, [step, rot]);

  const flipStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(rot.value), [0, 0.8, 1], [1, 0.2, 0], Extrapolation.CLAMP),
    transform: [{ perspective: 1000 }, { translateX: rot.value * 24 }, { rotateY: `${rot.value * 45}deg` }],
  }));

  const idx = Math.min(shown, steps.length - 1);

  return (
    <Animated.View style={[styles.stage, flipStyle]} pointerEvents="none">
      <StepBody
        key={idx}
        step={steps[idx]}
        index={idx}
        total={steps.length}
        template={template}
        claimCount={claimCount}
      />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Footer: progress + hint / next-rabbit-hole CTA
// ─────────────────────────────────────────────────────────────────────────

function Segment({ state, accent }: { state: "done" | "current" | "todo"; accent: string }) {
  const fill = useSharedValue(state === "todo" ? 0 : 1);
  useEffect(() => {
    fill.value = withTiming(state === "todo" ? 0 : 1, { duration: state === "todo" ? 150 : 380 });
  }, [state, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={styles.segTrack}>
      <Animated.View
        style={[styles.segFill, { backgroundColor: accent, opacity: state === "current" ? 1 : 0.55 }, fillStyle]}
      />
    </View>
  );
}

function CardFooter({
  steps,
  step,
  template,
  nextCuriosity,
  isLastDiscovery,
  onAdvance,
}: {
  steps: FlowStep[];
  step: number;
  template: LabelTemplate;
  nextCuriosity?: string;
  isLastDiscovery: boolean;
  onAdvance: () => void;
}) {
  const isLast = step >= steps.length - 1;

  return (
    <View style={styles.footer} pointerEvents="box-none">
      <View style={styles.segRow} pointerEvents="none">
        {steps.map((s, i) => (
          <Segment key={s.key} accent={template.accent} state={i < step ? "done" : i === step ? "current" : "todo"} />
        ))}
      </View>

      {isLast ? (
        <Pressable
          onPress={onAdvance}
          style={({ pressed }) => [styles.curiosityPill, { borderColor: withAlpha(template.accent, 0.5) }, pressed && styles.pressedSubtle]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.curiosityLabel, { color: template.accent, fontFamily: Fonts.sans }]}>
              {isLastDiscovery ? "YOU'RE CAUGHT UP" : "NEXT RABBIT HOLE"}
            </Text>
            <Text numberOfLines={3} style={[styles.curiosityText, { fontFamily: Fonts.sans }]}>
              {nextCuriosity ?? "On to the next discovery"}
            </Text>
          </View>
          <Text style={[styles.curiosityArrow, { color: template.accent }]}>↑</Text>
        </Pressable>
      ) : (
        <Text style={[styles.hint, { fontFamily: Fonts.sans }]} pointerEvents="none">
          tap to keep going
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// One page of the feed
// ─────────────────────────────────────────────────────────────────────────

function FlowCardItem({
  discovery,
  index,
  scrollY,
  width,
  height,
  topInset,
  active,
  isLastDiscovery,
  onAdvance,
}: {
  discovery: Discovery;
  index: number;
  scrollY: ReturnType<typeof useSharedValue<number>>;
  width: number;
  height: number;
  topInset: number;
  active: boolean;
  isLastDiscovery: boolean;
  onAdvance: () => void;
}) {
  const template = useMemo(() => resolveTemplate(discovery.label, discovery.topics), [discovery.label, discovery.topics]);
  const total = discovery.steps.length;

  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const stepSV = useSharedValue(0);
  const dragX = useSharedValue(0);

  const setBoth = (n: number) => {
    stepRef.current = n;
    stepSV.value = n;
    setStep(n);
  };

  /** +1 = forward (next step, or next discovery after the last step), -1 = back. */
  const go = useCallback(
    (dir: 1 | -1) => {
      const cur = stepRef.current;
      if (dir === 1) {
        if (cur >= total - 1) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onAdvance();
          return;
        }
        Haptics.selectionAsync().catch(() => {});
        setBoth(cur + 1);
      } else if (cur > 0) {
        Haptics.selectionAsync().catch(() => {});
        setBoth(cur - 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total, onAdvance]
  );

  // Horizontal swipe = slideshow. Content tracks the finger with rubber-band
  // resistance, then springs back; the flip does the transition.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .activeOffsetX([-14, 14])
        .failOffsetY([-14, 14])
        .onUpdate((e) => {
          const raw = e.translationX;
          const atStart = stepSV.value <= 0;
          dragX.value = raw * (raw < 0 ? 0.5 : atStart ? 0.15 : 0.5);
        })
        .onEnd((e) => {
          const committed = Math.abs(e.translationX) > SWIPE_DISTANCE || Math.abs(e.velocityX) > SWIPE_VELOCITY;
          if (committed) runOnJS(go)(e.translationX < 0 ? 1 : -1);
        })
        .onFinalize(() => {
          dragX.value = withSpring(0, { damping: 20, stiffness: 240 });
        }),
    [go, dragX, stepSV]
  );

  // Scroll-linked focus effect between neighbouring pages (UI thread).
  const cardStyle = useAnimatedStyle(() => {
    const range = [(index - 1) * height, index * height, (index + 1) * height];
    return {
      opacity: interpolate(scrollY.value, range, [0.6, 1, 0.6], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(scrollY.value, range, [0.94, 1, 0.94], Extrapolation.CLAMP) }],
    };
  });

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.value }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, { width, height }, cardStyle]}>
        <LabelBackdrop template={template} active={active} step={step} stepCount={total} />

        {/* Text-first scrim: quiets the animated backdrop so the words dominate. */}
        <LinearGradient
          colors={["rgba(3,2,8,0.30)", "rgba(3,2,8,0.52)", "rgba(3,2,8,0.5)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Story-style tap zones (left third = back, rest = forward). Content above is pointerEvents="none" so taps fall through. */}
        <Pressable style={[styles.tapZone, { left: 0, width: "32%" }]} onPress={() => go(-1)} />
        <Pressable style={[styles.tapZone, { left: "32%", right: 0 }]} onPress={() => go(1)} />

        <Animated.View
          style={[styles.content, { paddingTop: topInset + Spacing.two }, dragStyle]}
          pointerEvents="box-none"
        >
          <View pointerEvents="none">
            <View style={styles.metaRow}>
              <View style={[styles.labelChip, { borderColor: withAlpha(template.accent, 0.4) }]}>
                <Text style={[styles.labelChipText, { color: template.accent, fontFamily: Fonts.sans }]}>
                  {template.glyph} {discovery.label.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.readTime, { fontFamily: Fonts.sans }]}>{discovery.readTime}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.metaTitle, { fontFamily: Fonts.sans }]}>
              {discovery.title}
            </Text>
          </View>

          <StepStage steps={discovery.steps} step={step} template={template} claimCount={discovery.claimCount} />

          <CardFooter
            steps={discovery.steps}
            step={step}
            template={template}
            nextCuriosity={discovery.nextCuriosity}
            isLastDiscovery={isLastDiscovery}
            onAdvance={() => go(1)}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────

export default function FlowScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [deck, setDeck] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(insets.top + 150);

  const listRef = useRef<FlatList<Discovery>>(null);
  const scrollY = useSharedValue(0);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    discoveryService
      .getDiscoveries(activeFilter)
      .then((items) => {
        if (cancelled) return;
        setDeck(items);
        setActiveIndex(0);
        activeIndexRef.current = 0;
        scrollY.value = 0;
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setDeck([]);
        setError(e instanceof Error ? e.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, reloadKey]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (height <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.y / height);
      activeIndexRef.current = idx;
      setActiveIndex(idx);
    },
    [height]
  );

  const handleAdvance = useCallback(
    (index: number) => {
      if (index + 1 >= deck.length) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return;
      }
      listRef.current?.scrollToOffset({ offset: (index + 1) * height, animated: true });
    },
    [deck.length, height]
  );

  const handleFilterPress = useCallback(() => {
    // TODO: wire to a real filter sheet. For now, cycle through the topic list.
    const idx = TOPIC_FILTERS.indexOf(activeFilter as (typeof TOPIC_FILTERS)[number]);
    setActiveFilter(TOPIC_FILTERS[(idx + 1) % TOPIC_FILTERS.length]);
  }, [activeFilter]);

  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    setHeaderHeight(e.nativeEvent.layout.height);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Discovery; index: number }) => (
      <FlowCardItem
        discovery={item}
        index={index}
        scrollY={scrollY}
        width={width}
        height={height}
        topInset={headerHeight}
        active={index === activeIndex}
        isLastDiscovery={index === deck.length - 1}
        onAdvance={() => handleAdvance(index)}
      />
    ),
    [scrollY, width, height, headerHeight, activeIndex, deck.length, handleAdvance]
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
      <View style={styles.container}>
        <Animated.FlatList
          ref={listRef}
          data={deck}
          keyExtractor={(item: Discovery) => item.id}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          extraData={activeIndex}
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
            <View style={[styles.emptyCard, { width, height }]}>
              <Text style={[styles.emptyState, { fontFamily: Fonts.sans }]}>
                {loading ? "Loading…" : error ?? "Nothing here yet — try another topic."}
              </Text>
              {!loading && error && (
                <Pressable
                  onPress={() => setReloadKey((k) => k + 1)}
                  style={({ pressed }) => [styles.retryButton, pressed && styles.pressedSubtle]}
                >
                  <Text style={[styles.retryText, { fontFamily: Fonts.sans }]}>Try again</Text>
                </Pressable>
              )}
            </View>
          }
        />

        <View
          onLayout={onHeaderLayout}
          style={[styles.headerFloating, { paddingTop: insets.top + Spacing.two }]}
          pointerEvents="box-none"
        >
          <FlowHeader onFilterPress={handleFilterPress} />
          <FlowTopics active={activeFilter} onSelect={setActiveFilter} />
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
  container: { flex: 1, overflow: "hidden", backgroundColor: "#05040c" },
  pressedSubtle: { opacity: 0.7 },

  // Header
  headerFloating: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  header: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 24, fontWeight: "600", color: TEXT },
  headerSubtitle: { fontSize: 14, marginTop: 4, color: TEXT_DIM },
  filterButton: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: HAIRLINE,
    alignItems: "center", justifyContent: "center",
  },
  topicsRow: {
    flexDirection: "row", flexWrap: "wrap", gap: Spacing.two,
    paddingHorizontal: Spacing.four, paddingBottom: Spacing.three,
  },
  topicChip: { paddingHorizontal: Spacing.three, paddingVertical: 8, borderRadius: 999 },
  topicChipActive: { backgroundColor: "#FFFFFF" },
  topicChipInactive: { borderWidth: 1, borderColor: HAIRLINE, backgroundColor: "rgba(0,0,0,0.3)" },
  topicChipText: { fontSize: 13, fontWeight: "600" },

  // Empty / error
  emptyCard: { alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.five },
  emptyState: { fontSize: 14, color: TEXT_DIM, textAlign: "center" },
  retryButton: {
    marginTop: Spacing.three, paddingHorizontal: Spacing.four, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1, borderColor: HAIRLINE,
  },
  retryText: { fontSize: 14, fontWeight: "600", color: TEXT },

  // Card
  card: { overflow: "hidden" },
  tapZone: { position: "absolute", top: 0, bottom: 0 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.five,
    paddingBottom: BOTTOM_NAV_SPACE,
  },

  // Meta (label + title) — deliberately quiet so the step text leads
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two, marginBottom: 6 },
  labelChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  labelChipText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  readTime: { fontSize: 11, color: TEXT_FAINT },
  metaTitle: { fontSize: 12, lineHeight: 16, color: TEXT_FAINT },

  // Stage
  stage: { flex: 1, justifyContent: "center" },
  eyebrowRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.three },
  eyebrowGlyph: { fontSize: 14, marginRight: 8 },
  eyebrowText: { fontSize: 12, fontWeight: "800", letterSpacing: 1.6 },
  eyebrowCount: { marginLeft: "auto", fontSize: 11, color: TEXT_FAINT, letterSpacing: 0.6 },

  // Hook — the loudest thing in the feed
  hookLead: { fontSize: 16, lineHeight: 23, color: TEXT_DIM, marginBottom: Spacing.three },
  hookQuestion: { fontWeight: "700", color: TEXT, letterSpacing: -0.5 },

  tensionWrap: { borderLeftWidth: 3, paddingLeft: Spacing.three },
  tensionText: { fontWeight: "600", color: TEXT },

  revealRule: { width: 48, height: 4, borderRadius: 2, marginBottom: Spacing.three },
  revealText: {
    fontWeight: "700", color: TEXT, letterSpacing: -0.3,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
  },

  whyPanel: {
    backgroundColor: "rgba(0,0,0,0.32)", borderColor: HAIRLINE, borderWidth: 1,
    borderRadius: 22, padding: Spacing.four,
  },
  whyRow: { flexDirection: "row", alignItems: "flex-start" },
  whyDot: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    alignItems: "center", justifyContent: "center", marginRight: Spacing.three, marginTop: 1,
  },
  whyDotText: { fontSize: 12, fontWeight: "700" },
  whyText: { flex: 1, fontSize: 20, lineHeight: 30, fontWeight: "500", color: TEXT },

  surpriseCard: {
    borderWidth: 1, borderRadius: 24, padding: Spacing.four, overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.3)", transform: [{ rotate: "-1deg" }],
  },
  surpriseBang: { position: "absolute", right: 8, top: -44, fontSize: 180, fontWeight: "700" },
  surpriseText: { fontWeight: "600", color: TEXT },

  nodesRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.four },
  node: { width: 16, height: 16, borderRadius: 8 },
  nodeLine: { width: 56, height: 2, marginHorizontal: 6, borderRadius: 1 },
  connectionText: { fontWeight: "500", color: TEXT },

  takeawayCard: { borderWidth: 1, borderRadius: 26, padding: Spacing.four },
  takeawayText: { fontWeight: "700", color: TEXT, letterSpacing: -0.3 },
  takeawayFoot: { marginTop: Spacing.three, fontSize: 12, color: TEXT_DIM },

  // Footer
  footer: { paddingTop: Spacing.three },
  segRow: { flexDirection: "row", gap: 4 },
  segTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" },
  segFill: { height: 3, borderRadius: 2 },
  hint: { marginTop: Spacing.three, fontSize: 12, color: TEXT_FAINT, letterSpacing: 0.3 },

  curiosityPill: {
    marginTop: Spacing.three, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 20, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  curiosityLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 4 },
  curiosityText: { fontSize: 16, lineHeight: 22, color: TEXT, fontWeight: "600" },
  curiosityArrow: { fontSize: 22, marginLeft: Spacing.three },
});
