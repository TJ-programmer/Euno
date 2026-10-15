/**
 * Deep dive — src/app/deep-dive/[id].tsx
 *
 * A tactile paper-book reader for Expo / React Native.
 * - A real-feeling hard cover swings open from the spine on entry.
 * - Long-form detail is split across individual physical paper leaves.
 * - Each horizontal swipe/tap turns a leaf with 3D perspective, a curled-edge
 *   highlight, a changing shadow, a visible reverse side, and a paper stack.
 * - The entire palette is derived from the content label. Unknown labels get
 *   a stable, deterministic colour so different topics do not share one theme.
 * - Supports light/dark mode, dynamic text size, haptics, and Reduce Motion.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewProps,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { Colors, Fonts, Spacing } from "@/constants/theme";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type Theme = typeof Colors.light;
type TypeScale = ReturnType<typeof makeType>;
type PageKind = "cover" | "detail";
type BookPage = {
  key: string;
  kind: PageKind;
  text?: string;
  pageNumber?: number;
  isLast?: boolean;
};

/** Compared after normalizeKey(), so write them normalized. */
const SUMMARY_KEYS = [
  "detailedsummary",
  "detailedsummarytext",
  "longsummary",
  "overview",
  "summary",
  "explanation",
];

/** Text-size steps for the "Aa" control. */
const TEXT_SCALES = [0.92, 1, 1.14, 1.3];
const DEFAULT_SCALE_INDEX = 1;

const PAGE_MARGIN = 12;
const MAX_MEASURE = 640;
const FLIP_ANGLE = 180; // a full turn: the page lands on the left of the spine
const PERSPECTIVE = 2400;
const PAPER_V = 8; // vertical margin of the paper
const OPEN_DELAY = 650; // cover content waits for the book to start opening
const WORDS_PER_MINUTE = 200;

/* ------------------------------------------------------------------ */
/* Label colours                                                       */
/* ------------------------------------------------------------------ */

type Palette = {
  accent: string;
  accentSoft: string;
  cover: string;
  coverInk: string;
  paper: string;
  paperWash: string;
  paperEdge: string;
};

/**
 * A topic hue map. Short keys (AI, ML, art) are matched as whole words to
 * avoid accidental hits inside unrelated labels; longer stems can match
 * naturally (for example "psychology", "economics", or "biological science").
 */
const LABEL_HUES: [string[], number][] = [
  [["science", "physics", "chemistry", "biology", "math", "research", "data", "statistics"], 195],
  [["space", "astronomy", "cosmos", "planet", "universe", "nasa"], 250],
  [["technology", "tech", "ai", "ml", "computing", "engineering", "software", "programming", "robotics", "cyber", "data science"], 215],
  [["history", "culture", "politic", "society", "war", "civilization", "geography", "law", "government"], 24],
  [["health", "medicine", "wellness", "body", "fitness", "nutrition", "biology of health", "mental health"], 158],
  [["nature", "environment", "earth", "animal", "climate", "ecology", "ocean", "sustainability"], 132],
  [["art", "design", "music", "literature", "language", "film", "photography", "creative", "fashion"], 333],
  [["business", "econom", "financ", "money", "market", "startup", "entrepreneur", "accounting", "management"], 39],
  [["philosoph", "psycholog", "mind", "learning", "education", "cognition", "neuroscience"], 270],
  [["food", "cooking", "culinary", "recipe", "agriculture"], 12],
  [["travel", "tourism", "adventure", "destination"], 185],
];

const DEFAULT_HUE = 22;

function hueForLabel(label: string) {
  const key = normalizeKey(label);
  if (!key) return DEFAULT_HUE;

  const tokens = label.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const [words, hue] of LABEL_HUES) {
    if (words.some((word) => {
      if (word.length <= 3) return tokens.some((token) => token === word);
      return key.includes(normalizeKey(word));
    })) return hue;
  }

  // Stable, well-spread topic colour for any label not in the curated map.
  let hash = 17;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 360;
  return hash;
}

function makePalette(label: string, dark: boolean): Palette {
  const h = hueForLabel(label);

  return dark
    ? {
        accent: `hsl(${h}, 72%, 69%)`,
        accentSoft: `hsla(${h}, 68%, 65%, 0.19)`,
        cover: `hsl(${h}, 42%, 20%)`,
        coverInk: "#F7F0E6",
        paper: `hsl(${h}, 18%, 13%)`,
        paperWash: `hsla(${h}, 25%, 58%, 0.045)`,
        paperEdge: `hsla(${h}, 22%, 76%, 0.28)`,
      }
    : {
        accent: `hsl(${h}, 58%, 36%)`,
        accentSoft: `hsla(${h}, 58%, 42%, 0.12)`,
        cover: `hsl(${h}, 48%, 27%)`,
        coverInk: "#FBF5EA",
        paper: `hsl(${h}, 26%, 98%)`,
        paperWash: `hsla(${h}, 42%, 68%, 0.055)`,
        paperEdge: `hsla(${h}, 30%, 42%, 0.24)`,
      };
}

const PaletteContext = createContext<Palette>(makePalette("", false));

function usePalette(): Palette {
  return useContext(PaletteContext);
}

function makeType(scale: number) {
  const s = (n: number) => Math.round(n * scale);
  return {
    lead: { fontSize: s(20), lineHeight: s(33) },
    body: { fontSize: s(18), lineHeight: s(30) },
  };
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseJson(value: string | undefined): unknown {
  if (!value) return {};

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** Finds the detailed summary anywhere in the payload, best key first. */
function findDetailedSummary(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 6) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findDetailedSummary(item, depth + 1);
      if (result) return result;
    }

    return null;
  }

  const record = value as Record<string, unknown>;

  for (const key of SUMMARY_KEYS) {
    const match = Object.keys(record).find(
      (candidate) => normalizeKey(candidate) === key,
    );

    if (match) {
      const candidate = record[match];

      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  for (const child of Object.values(record)) {
    const result = findDetailedSummary(child, depth + 1);
    if (result) return result;
  }

  return null;
}

/** Breaks a sentence run into chunks of roughly `target` characters. */
function chunkSentences(text: string, target: number) {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current && current.length + sentence.length > target) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence;
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

/**
 * Short paragraphs are easier to read on a phone. Respects existing blank
 * lines and only splits blocks that are long.
 */
function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) =>
      block.length <= 380 ? [block] : chunkSentences(block, 300),
    );
}

/** Packs paragraphs into separate leaves instead of making one endless page. */
function paginateDetail(text: string, targetChars = 760): string[] {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) return [];

  const pages: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const paragraph of paragraphs) {
    const extraLength = paragraph.length + (current.length ? 2 : 0);
    if (current.length && currentLength + extraLength > targetChars) {
      pages.push(current.join("\n\n"));
      current = [];
      currentLength = 0;
    }
    current.push(paragraph);
    currentLength += paragraph.length + (current.length > 1 ? 2 : 0);
  }

  if (current.length) pages.push(current.join("\n\n"));
  return pages;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Same text with whitespace and case ignored, to spot a repeated summary. */
function sameText(a: string, b: string) {
  const clean = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
  return clean(a) === clean(b);
}

/* ------------------------------------------------------------------ */
/* Page content                                                        */
/* ------------------------------------------------------------------ */

function Paragraphs({
  text,
  theme,
  type,
  lead = false,
}: {
  text: string;
  theme: Theme;
  type: TypeScale;
  lead?: boolean;
}) {
  return (
    <View style={styles.paragraphs}>
      {splitParagraphs(text).map((p, i) => (
        <Text
          key={i}
          selectable
          style={[
            lead && i === 0 ? type.lead : type.body,
            { color: theme.text, fontFamily: Fonts.serif },
          ]}
        >
          {p}
        </Text>
      ))}
    </View>
  );
}

function CoverContent({
  theme,
  type,
  label,
  title,
  readTime,
  topics,
  summary,
}: {
  theme: Theme;
  type: TypeScale;
  label: string;
  title: string;
  readTime: string;
  topics: string[];
  summary: string;
}) {
  const palette = usePalette();
  const reduced = useReducedMotion();

  // Short staggered fade-in as the book opens. Skipped for Reduce Motion.
  const enter = (delay: number) =>
    reduced ? undefined : FadeInDown.delay(OPEN_DELAY + delay).duration(420);

  const meta = [
    `${readTime} min read`,
    ...topics.slice(0, 3).map(formatLabel),
  ].join(" · ");

  return (
    <>
      {label ? (
        <Animated.View
          entering={enter(0)}
          style={[styles.labelPill, { backgroundColor: palette.accentSoft }]}
        >
          <Text
            style={[
              styles.labelPillText,
              { color: palette.accent, fontFamily: Fonts.sans },
            ]}
          >
            {formatLabel(label)}
          </Text>
        </Animated.View>
      ) : null}

      <Animated.Text
        entering={enter(90)}
        style={[styles.title, { color: theme.text, fontFamily: Fonts.serif }]}
        accessibilityRole="header"
      >
        {title}
      </Animated.Text>

      <Animated.Text
        entering={enter(180)}
        style={[
          styles.meta,
          { color: theme.textSecondary, fontFamily: Fonts.sans },
        ]}
      >
        {meta}
      </Animated.Text>

      {summary ? (
        <Animated.View entering={enter(270)}>
          <View style={[styles.rule, { backgroundColor: palette.accent }]} />
          <Paragraphs text={summary} theme={theme} type={type} lead />
        </Animated.View>
      ) : null}
    </>
  );
}

function DetailContent({
  theme,
  type,
  detail,
  pageNumber,
  pageCount,
}: {
  theme: Theme;
  type: TypeScale;
  detail: string;
  pageNumber: number;
  pageCount: number;
}) {
  const palette = usePalette();

  return (
    <>
      <View style={[styles.rule, { backgroundColor: palette.accent }]} />

      <Text
        style={[
          styles.eyebrow,
          { color: palette.accent, fontFamily: Fonts.sans },
        ]}
      >
        CHAPTER NOTES · {String(pageNumber).padStart(2, "0")} / {String(pageCount).padStart(2, "0")}
      </Text>

      <Text
        style={[
          styles.sectionTitle,
          { color: theme.text, fontFamily: Fonts.serif },
        ]}
        accessibilityRole="header"
      >
        {pageNumber === 1 ? "The full picture" : "Keep exploring"}
      </Text>

      <Paragraphs text={detail} theme={theme} type={type} />
    </>
  );
}

/** Vertical reader for one page, with a hairline showing how far you've read. */
function PageScroll({
  centered = false,
  children,
}: {
  centered?: boolean;
  children: React.ReactNode;
}) {
  const palette = usePalette();
  const y = useSharedValue(0);
  const contentH = useSharedValue(1);
  const viewH = useSharedValue(1);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      y.value = e.contentOffset.y;
    },
  });

  const fillStyle = useAnimatedStyle(() => {
    const max = contentH.value - viewH.value;
    const p = max > 0 ? Math.min(1, Math.max(0, y.value / max)) : 0;
    return { width: `${p * 100}%` };
  });

  return (
    <>
      <Animated.ScrollView
        style={styles.flex}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.pageContent,
          centered && styles.pageContentCentered,
        ]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(_, h) => {
          contentH.value = h;
        }}
        onLayout={(e) => {
          viewH.value = e.nativeEvent.layout.height;
        }}
      >
        {children}
      </Animated.ScrollView>

      <View style={styles.progressTrack} pointerEvents="none">
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: palette.accent },
            fillStyle,
          ]}
        />
      </View>
    </>
  );
}

/** End-of-cover invitation to keep reading. The arrow gently nudges right. */
function NextLink({
  theme,
  title,
  onPress,
}: {
  theme: Theme;
  title: string;
  onPress: () => void;
}) {
  const palette = usePalette();
  const reduced = useReducedMotion();
  const nudge = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;

    nudge.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(nudge);
  }, [reduced, nudge]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));

  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.delay(OPEN_DELAY + 450).duration(420)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Next page: ${title}`}
        style={({ pressed }) => [
          styles.nextLink,
          { borderTopColor: theme.onboardingBorder },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.nextText}>
          <Text
            style={[
              styles.nextLabel,
              { color: palette.accent, fontFamily: Fonts.sans },
            ]}
          >
            Next
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.nextTitle,
              { color: theme.text, fontFamily: Fonts.serif },
            ]}
          >
            {title}
          </Text>
        </View>

        <Animated.Text
          style={[styles.nextArrow, { color: palette.accent }, arrowStyle]}
        >
          ›
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

function Closing({ theme, onDone }: { theme: Theme; onDone: () => void }) {
  const palette = usePalette();

  return (
    <View style={[styles.closing, { borderTopColor: theme.onboardingBorder }]}>
      <Text
        style={[
          styles.closingText,
          { color: theme.textSecondary, fontFamily: Fonts.serif },
        ]}
      >
        Stay curious.
      </Text>

      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.doneButton,
          { borderColor: palette.accent },
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.doneText,
            { color: palette.accent, fontFamily: Fonts.sans },
          ]}
        >
          Back to Home
        </Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* One physical page                                                   */
/* ------------------------------------------------------------------ */

/**
 * Pages are stacked like a book (lower index on top, see PageCell). While the
 * list scrolls, each page cancels the scroll and stays pinned, so the top
 * page can hinge on its spine edge and swing over like a real sheet of paper:
 * front face first, then (past 90°) its blank back, landing on the left.
 * A shadow falls on the page below, and a sheen crosses the lifting page.
 */
function Page({
  index,
  scrollX,
  reduceMotion,
  width,
  height,
  theme,
  isDark,
  bookmark = false,
  children,
}: {
  index: number;
  scrollX: ReturnType<typeof useSharedValue<number>>;
  reduceMotion: ReturnType<typeof useSharedValue<number>>;
  width: number;
  height: number;
  theme: Theme;
  isDark: boolean;
  bookmark?: boolean;
  children: React.ReactNode;
}) {
  const palette = usePalette();

  const turnStyle = useAnimatedStyle(() => {
    const offset = scrollX.value - index * width;
    const p = offset / width;
    const rm = reduceMotion.value === 1;

    // Cancel the scroll so the page stays put; once fully turned, park it
    // off-screen so it can't swallow touches meant for the page below.
    const pin = rm ? 0 : Math.max(-width, Math.min(width, offset));
    const parked = !rm && p > 0.995 ? -width * 2 : 0;

    const angle = rm
      ? 0
      : interpolate(p, [-1, 0, 1], [0, 0, -FLIP_ANGLE], Extrapolation.CLAMP);

    // Hinge on the paper's own left edge (it sits PAGE_MARGIN inside the cell).
    const hinge = width / 2 - PAGE_MARGIN;

    return {
      transform: [
        { translateX: pin + parked },
        { perspective: PERSPECTIVE },
        { translateX: -hinge },
        { rotateY: `${angle}deg` },
        { translateX: hinge },
      ],
    };
  });

  // Blank back of the sheet, shown once the page is past edge-on.
  const backStyle = useAnimatedStyle(() => {
    const p = (scrollX.value - index * width) / width;
    return {
      opacity: reduceMotion.value
        ? 0
        : interpolate(p, [0.44, 0.5, 0.56], [0, 1, 1], Extrapolation.CLAMP),
    };
  });

  // A narrow highlight at the free edge makes the lifted sheet read as paper.
  const curlStyle = useAnimatedStyle(() => {
    const p = (scrollX.value - index * width) / width;
    return {
      opacity: reduceMotion.value
        ? 0
        : interpolate(p, [0, 0.12, 0.42, 0.76, 1], [0, 0.55, 1, 0.7, 0], Extrapolation.CLAMP),
    };
  });

  // Falls on the page below as this one lifts, deepens as it tilts away.
  const shadeStyle = useAnimatedStyle(() => {
    const p = (scrollX.value - index * width) / width;
    return {
      opacity: reduceMotion.value
        ? 0
        : interpolate(p, [-1, 0, 0.5], [0.22, 0, 0.35], Extrapolation.CLAMP),
    };
  });

  // Light catching the lifting page.
  const sheenStyle = useAnimatedStyle(() => {
    const p = (scrollX.value - index * width) / width;
    return {
      opacity: reduceMotion.value
        ? 0
        : interpolate(p, [0, 0.12, 0.4], [0, 1, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[{ width, height }, turnStyle]}>
      <View
        style={[
          styles.paperShadow,
          { backgroundColor: palette.paper, borderColor: palette.paperEdge },
        ]}
      >
        <View style={[styles.paperClip, { backgroundColor: palette.paper }]}>
          {/* The paper itself carries a very subtle tint from the content label. */}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: palette.paperWash }]}
            pointerEvents="none"
          />

          {children}

          {/* Ribbon bookmark on the cover */}
          {bookmark ? (
            <View
              style={[styles.ribbon, { backgroundColor: palette.accent }]}
              pointerEvents="none"
            />
          ) : null}

          {/* Spine shading */}
          <LinearGradient
            colors={[
              isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.09)",
              "rgba(0,0,0,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.spine}
            pointerEvents="none"
          />

          {/* Sheen */}
          <Animated.View
            style={[StyleSheet.absoluteFill, sheenStyle]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.22)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Shadow falling onto the sheet beneath the one being turned. */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]}
            pointerEvents="none"
          />

          {/* The reverse of a paper leaf becomes visible after the midpoint. */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: palette.paper },
              backStyle,
            ]}
            pointerEvents="none"
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.paperWash }]} />
            <LinearGradient
              colors={[
                isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)",
                "rgba(0,0,0,0)",
              ]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Moving highlight along the free (right) edge of the paper. */}
          <Animated.View style={[styles.pageCurl, curlStyle]} pointerEvents="none">
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.30)", "rgba(0,0,0,0.10)"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * The closed book. Sits over the first page on entry, then opens from its
 * right edge: the spine side stays put and the cover swings over to the left.
 */
function BookCover({
  palette,
  label,
  title,
  width,
  onOpened,
}: {
  palette: Palette;
  label: string;
  title: string;
  width: number;
  onOpened: () => void;
}) {
  const open = useSharedValue(0);
  const w = width - PAGE_MARGIN * 2;

  useEffect(() => {
    open.value = withDelay(
      300,
      withTiming(
        1,
        { duration: 1250, easing: Easing.bezier(0.42, 0, 0.18, 1) },
        (done) => {
          if (done) runOnJS(onOpened)();
        },
      ),
    );
    return () => cancelAnimation(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coverStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { translateX: -w / 2 },
      { rotateY: `${interpolate(open.value, [0, 1], [0, -FLIP_ANGLE])}deg` },
      { translateX: w / 2 },
    ],
  }));

  const faceStyle = useAnimatedStyle(() => ({ opacity: open.value < 0.5 ? 1 : 0 }));

  return (
    <Animated.View style={[styles.bookCover, { backgroundColor: palette.cover }, coverStyle]}>
      <Animated.View style={[styles.coverFace, faceStyle]}>
        <View style={[styles.coverFrame, { borderColor: `${palette.coverInk}55` }]} />

        {label ? (
          <Text
            style={[styles.coverLabel, { color: palette.coverInk, fontFamily: Fonts.sans }]}
          >
            {formatLabel(label).toUpperCase()}
          </Text>
        ) : null}

        <View style={[styles.coverRule, { backgroundColor: palette.coverInk }]} />

        <Text
          numberOfLines={5}
          style={[styles.coverTitle, { color: palette.coverInk, fontFamily: Fonts.serif }]}
        >
          {title}
        </Text>
      </Animated.View>

      <LinearGradient
        colors={["rgba(0,0,0,0.38)", "rgba(0,0,0,0.08)", "rgba(0,0,0,0)"]}
        locations={[0, 0.28, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.spine}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.coverEdge}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

/** Stacks list cells like a book: page 1 on top, so it can lift off page 2. */
function PageCell({
  index,
  style,
  children,
  onLayout,
}: ViewProps & { index: number; children?: React.ReactNode }) {
  return (
    <View onLayout={onLayout} style={[style, { zIndex: 10000 - index }]}>
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Chrome: top bar + page controls                                     */
/* ------------------------------------------------------------------ */

function RoundButton({
  theme,
  label,
  onPress,
  disabled,
  children,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.roundButton,
        { borderColor: theme.onboardingBorder },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

function PageControls({
  theme,
  count,
  page,
  onGo,
  bottomInset,
  minutesLeft,
}: {
  theme: Theme;
  count: number;
  page: number;
  onGo: (index: number) => void;
  bottomInset: number;
  minutesLeft: number;
}) {
  const palette = usePalette();

  return (
    <View style={[styles.controls, { paddingBottom: bottomInset + 10 }]}>
      <RoundButton
        theme={theme}
        label="Previous page"
        disabled={page === 0}
        onPress={() => onGo(page - 1)}
      >
        <Text style={[styles.arrowText, { color: theme.text }]}>‹</Text>
      </RoundButton>

      <View style={styles.controlsCenter}>
        <View style={styles.segRow}>
          {Array.from({ length: count }, (_, i) => (
            <Pressable
              key={i}
              onPress={() => onGo(i)}
              hitSlop={{ top: 14, bottom: 14 }}
              accessibilityRole="button"
              accessibilityLabel={`Go to page ${i + 1} of ${count}`}
              style={styles.segHit}
            >
              <View
                style={[
                  styles.seg,
                  {
                    backgroundColor:
                      i <= page ? palette.accent : theme.onboardingBorder,
                    opacity: i === page ? 1 : i < page ? 0.55 : 1,
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>

        <Text
          style={[
            styles.hint,
            { color: theme.textSecondary, fontFamily: Fonts.sans },
          ]}
        >
          {page === 0
            ? "Swipe to turn the paper"
            : `About ${minutesLeft} min to read`}
        </Text>
      </View>

      <RoundButton
        theme={theme}
        label="Next page"
        disabled={page >= count - 1}
        onPress={() => onGo(page + 1)}
      >
        <Text style={[styles.arrowText, { color: theme.text }]}>›</Text>
      </RoundButton>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function DeepDiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const isDark = scheme === "dark";

  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    label?: string;
    readTime?: string;
    summary?: string;
    topics?: string;
    payload?: string;
  }>();

  const reduced = useReducedMotion();
  const topics = useMemo(() => {
    const parsed = parseJson(params.topics);

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  }, [params.topics]);
  const paletteLabel = params.label?.trim() || topics[0] || params.title || "";
  const palette = useMemo(
    () => makePalette(paletteLabel, isDark),
    [paletteLabel, isDark],
  );

  const [coverGone, setCoverGone] = useState(!!reduced);
  const onOpened = useCallback(() => setCoverGone(true), []);

  const [page, setPage] = useState(0);
  const [scaleIndex, setScaleIndex] = useState(DEFAULT_SCALE_INDEX);
  const [listHeight, setListHeight] = useState(0);

  const listRef = useRef<FlatList<BookPage>>(null);
  const pageRef = useRef(0);
  const scrollX = useSharedValue(0);
  const reduceMotion = useSharedValue(reduced ? 1 : 0);

  // Respect the system "Reduce Motion" setting.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        reduceMotion.value = enabled ? 1 : 0;
        if (enabled) setCoverGone(true);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        reduceMotion.value = enabled ? 1 : 0;
        if (enabled) setCoverGone(true);
      },
    );

    return () => sub.remove();
  }, [reduceMotion]);

  const type = useMemo(() => makeType(TEXT_SCALES[scaleIndex]), [scaleIndex]);

  const payload = useMemo(() => parseJson(params.payload), [params.payload]);

  const shortSummary = params.summary?.trim() ?? "";

  // The detailed summary becomes page 2, unless it only repeats the short one.
  const detail = useMemo(() => {
    const found = findDetailedSummary(payload) ?? "";
    if (!found) return "";
    if (shortSummary && sameText(found, shortSummary)) return "";
    return found;
  }, [payload, shortSummary]);

  // If Home didn't pass a short summary, borrow the opening of the detail.
  const coverSummary = useMemo(() => {
    if (shortSummary) return shortSummary;
    if (!detail) return "";
    return chunkSentences(detail, 220)[0] ?? "";
  }, [shortSummary, detail]);

  // Keep the leaf length close to one visible phone/tablet page. This is based
  // on window dimensions (not measured list height) so page identities stay
  // stable while the screen is laying out.
  const targetDetailChars = useMemo(() => {
    const textWidth = Math.min(Math.max(width - 72, 220), MAX_MEASURE - 48);
    const charsPerLine = Math.max(22, Math.floor(textWidth / (18 * 0.52)));
    const usableHeight = Math.max(300, windowHeight - 270);
    const visibleLines = Math.max(8, Math.floor(usableHeight / 33));
    return Math.max(380, Math.min(900, charsPerLine * visibleLines));
  }, [width, windowHeight]);

  const detailPages = useMemo(
    () => paginateDetail(detail, targetDetailChars),
    [detail, targetDetailChars],
  );

  // Every detail chunk is its own leaf, so swiping always turns physical paper.
  const pages = useMemo<BookPage[]>(() => {
    const cover: BookPage = { key: "cover", kind: "cover" };
    if (!detailPages.length) return [cover];

    const leaves = detailPages.map((text, index): BookPage => ({
      key: `detail-${index + 1}`,
      kind: "detail",
      text,
      pageNumber: index + 1,
      isLast: index === detailPages.length - 1,
    }));
    return [cover, ...leaves];
  }, [detailPages]);

  const isPaged = pages.length > 1;

  const detailMinutes = useMemo(
    () => Math.max(1, Math.ceil(countWords(detail) / WORDS_PER_MINUTE)),
    [detail],
  );

  const goBack = useCallback(() => router.back(), [router]);

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(index, pages.length - 1));
      if (next === pageRef.current) return;

      Haptics.selectionAsync().catch(() => {});
      pageRef.current = next;
      setPage(next);
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    },
    [pages.length, width],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      pageRef.current = idx;

      setPage((prev) => {
        if (prev !== idx) Haptics.selectionAsync().catch(() => {});
        return idx;
      });
    },
    [width],
  );

  const onListLayout = useCallback((e: LayoutChangeEvent) => {
    setListHeight(e.nativeEvent.layout.height);
  }, []);

  const cycleTextSize = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setScaleIndex((i) => (i + 1) % TEXT_SCALES.length);
  }, []);

  const renderPage = useCallback(
    ({ item, index }: { item: BookPage; index: number }) => (
      <Page
        index={index}
        scrollX={scrollX}
        reduceMotion={reduceMotion}
        width={width}
        height={listHeight}
        theme={theme}
        isDark={isDark}
        bookmark={item.kind === "cover"}
      >
        <PageScroll centered={item.kind === "cover"}>
          <View style={styles.measure}>
            {item.kind === "cover" ? (
              <>
                <CoverContent
                  theme={theme}
                  type={type}
                  label={paletteLabel}
                  title={params.title || "Explore this idea"}
                  readTime={params.readTime || "1"}
                  topics={topics}
                  summary={coverSummary}
                />

                {isPaged ? (
                  <NextLink
                    theme={theme}
                    title="Turn the page to begin"
                    onPress={() => goTo(1)}
                  />
                ) : (
                  <Closing theme={theme} onDone={goBack} />
                )}
              </>
            ) : (
              <>
                <DetailContent
                  theme={theme}
                  type={type}
                  detail={item.text ?? ""}
                  pageNumber={item.pageNumber ?? 1}
                  pageCount={detailPages.length}
                />
                {item.isLast ? (
                  <Closing theme={theme} onDone={goBack} />
                ) : (
                  <NextLink
                    theme={theme}
                    title="Keep reading"
                    onPress={() => goTo(index + 1)}
                  />
                )}
              </>
            )}
          </View>
        </PageScroll>
      </Page>
    ),
    [
      scrollX,
      reduceMotion,
      width,
      listHeight,
      theme,
      isDark,
      type,
      params.label,
      paletteLabel,
      params.title,
      params.readTime,
      topics,
      coverSummary,
      detail,
      detailPages.length,
      isPaged,
      goTo,
      goBack,
    ],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<BookPage> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const stackLayers = isPaged ? Math.min(3, pages.length - 1 - page) : 0;

  return (
    <PaletteContext.Provider value={palette}>
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            headerShown: false,
            animation: "fade",
          }}
        />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <RoundButton theme={theme} label="Go back" onPress={goBack}>
          <Text style={[styles.backIcon, { color: theme.text }]}>‹</Text>
        </RoundButton>

        <Text
          style={[
            styles.topCenter,
            { color: theme.textSecondary, fontFamily: Fonts.sans },
          ]}
          accessibilityLiveRegion="polite"
        >
          {isPaged
            ? `${page + 1} of ${pages.length}`
            : `${params.readTime || "1"} min read`}
        </Text>

        <RoundButton
          theme={theme}
          label="Change text size"
          onPress={cycleTextSize}
        >
          <Text
            style={[
              styles.aaText,
              { color: theme.text, fontFamily: Fonts.serif },
            ]}
          >
            Aa
          </Text>
        </RoundButton>
      </View>

      {/* Pages */}
      <View style={styles.listArea} onLayout={onListLayout}>
        {/* Edges of the pages still to come, peeking out behind the top page */}
        {Array.from({ length: stackLayers }, (_, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[
              styles.stackEdge,
              {
                left: PAGE_MARGIN + 3 * (i + 1),
                right: PAGE_MARGIN - 3 * (i + 1),
                top: PAPER_V + 3 * (i + 1),
                bottom: PAPER_V - 3 * (i + 1),
                backgroundColor: palette.paper,
                borderColor: palette.paperEdge,
              },
            ]}
          />
        ))}

        {listHeight > 0 ? (
          <Animated.FlatList
            ref={listRef}
            data={pages}
            keyExtractor={(item: BookPage) => item.key}
            renderItem={renderPage}
            getItemLayout={getItemLayout}
            CellRendererComponent={PageCell}
            extraData={`${scaleIndex}-${listHeight}-${scheme}`}
            horizontal
            pagingEnabled
            scrollEnabled={isPaged}
            bounces={false}
            disableIntervalMomentum
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleMomentumEnd}
            initialNumToRender={2}
            windowSize={3}
          />
        ) : null}

        {listHeight > 0 && !coverGone ? (
          <BookCover
            palette={palette}
            label={paletteLabel}
            title={params.title || "Explore this idea"}
            width={width}
            onOpened={onOpened}
          />
        ) : null}
      </View>

      {/* Page controls (only when there is more than one page) */}
      {isPaged ? (
        <PageControls
          theme={theme}
          count={pages.length}
          page={page}
          onGo={goTo}
          bottomInset={insets.bottom}
          minutesLeft={detailMinutes}
        />
      ) : (
        <View style={{ height: insets.bottom + 10 }} />
      )}
      </View>
    </PaletteContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.3,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingBottom: 10,
  },
  topCenter: {
    fontSize: 13,
    fontWeight: "500",
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 30,
    lineHeight: 34,
    marginTop: -3,
  },
  aaText: {
    fontSize: 16,
    fontWeight: "600",
  },

  // Pages
  listArea: {
    flex: 1,
  },
  paperShadow: {
    flex: 1,
    marginHorizontal: PAGE_MARGIN,
    marginVertical: PAPER_V,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  paperClip: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  pageCurl: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 18,
  },
  spine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 18,
  },
  shade: {
    backgroundColor: "#000",
  },
  stackEdge: {
    position: "absolute",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bookCover: {
    position: "absolute",
    zIndex: 50,
    left: PAGE_MARGIN,
    right: PAGE_MARGIN,
    top: PAPER_V,
    bottom: PAPER_V,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.30,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 9 },
    elevation: 8,
  },
  coverEdge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 4,
  },
  coverFace: {
    flex: 1,
    padding: 36,
    justifyContent: "center",
  },
  coverFrame: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  coverLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    opacity: 0.8,
  },
  coverRule: {
    width: 28,
    height: 2,
    marginVertical: 18,
    opacity: 0.7,
  },
  coverTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  ribbon: {
    position: "absolute",
    top: 0,
    right: 26,
    width: 14,
    height: 40,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  pageContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  pageContentCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  measure: {
    width: "100%",
    maxWidth: MAX_MEASURE,
    alignSelf: "center",
  },

  // Reading progress (per page)
  progressTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  progressFill: {
    height: 2,
  },

  // Cover
  labelPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 18,
  },
  labelPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "600",
    letterSpacing: -0.6,
  },
  meta: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  rule: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginTop: 22,
    marginBottom: 22,
  },

  // Detail page
  eyebrow: {
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 9,
  },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 33,
    fontWeight: "600",
    letterSpacing: -0.3,
    marginBottom: 18,
  },
  paragraphs: {
    gap: 16,
  },

  // Next link
  nextLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nextText: {
    flex: 1,
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  nextTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
  },
  nextArrow: {
    fontSize: 30,
    lineHeight: 34,
  },

  // Closing
  closing: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 24,
    marginTop: 36,
    alignItems: "center",
    gap: 16,
  },
  closingText: {
    fontSize: 22,
    fontStyle: "italic",
  },
  doneButton: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  doneText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Page controls
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: 10,
  },
  controlsCenter: {
    flex: 1,
  },
  segRow: {
    flexDirection: "row",
    gap: 4,
  },
  segHit: {
    flex: 1,
    justifyContent: "center",
  },
  seg: {
    height: 3,
    borderRadius: 2,
  },
  hint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  arrowText: {
    fontSize: 26,
    lineHeight: 30,
    marginTop: -2,
  },
});
