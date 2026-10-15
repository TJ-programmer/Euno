import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import { getHomeContent, type HomeFeedItem } from "@/lib/content";
import { getUsername } from "@/lib/profile";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HERO_WIDTH = SCREEN_WIDTH - Spacing.four * 2;
const HERO_SPACING = Spacing.two;
const HERO_ITEM_SIZE = HERO_WIDTH + HERO_SPACING;
const HERO_COUNT = 5;

/* ------------------------------------------------------------------ */
/* Debug logging (silent in production builds)                         */
/* ------------------------------------------------------------------ */

const DEBUG = __DEV__;

function log(scope: string, message: string, data?: unknown) {
  if (!DEBUG) return;
  const ts = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log(`[Home:${scope}] ${ts} ${message}`, data);
  } else {
    console.log(`[Home:${scope}] ${ts} ${message}`);
  }
}

function warn(scope: string, message: string, data?: unknown) {
  if (!DEBUG) return;
  console.warn(`[Home:${scope}] ${message}`, data ?? "");
}

/** Short, safe preview of a possibly huge payload. */
function preview(value: unknown, max = 200) {
  let str: string | undefined;

  try {
    str = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    str = "[unserializable]";
  }

  if (!str) return "";

  return str.length > max
    ? `${str.slice(0, max)}… (+${str.length - max} chars)`
    : str;
}

function isValidJson(str: string) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Fallback images, grouped by topic / label keywords                  */
/* ------------------------------------------------------------------ */

const u = (id: string) => `https://images.unsplash.com/${id}?w=900`;

const DEFAULT_IMAGE = u("photo-1500534623283-312aade485b7");

const GENERIC_IMAGES = [
  u("photo-1500534623283-312aade485b7"),
  u("photo-1519681393784-d120267933ba"),
  u("photo-1499750310107-5fef28a66643"),
  u("photo-1519501025264-65ba15a82390"),
  u("photo-1551244072-5d12893278ab"),
];

const FALLBACK_POOLS: { keywords: string[]; images: string[] }[] = [
  {
    // mind / psychology
    keywords: [
      "mind", "psychology", "neuroscience", "cognition",
      "behavior", "brain", "mental", "focus", "habit",
      "emotion", "sleep",
    ],
    images: [
      u("photo-1559757148-5c350d0d3c56"),
      u("photo-1506126613408-eca07ce68773"),
      u("photo-1499209974431-9dddcece7f88"),
    ],
  },
  {
    // tech / AI
    keywords: [
      "tech", "technology", "ai", "artificial", "software",
      "code", "coding", "data", "internet", "robot", "digital",
    ],
    images: [
      u("photo-1518770660439-4636190af475"),
      u("photo-1485827404703-89b55fcc595e"),
      u("photo-1461749280684-dccba630e2f6"),
      u("photo-1550751827-4bd374c3f58b"),
    ],
  },
  {
    // culture / history / society
    keywords: [
      "culture", "history", "society", "politics", "philosophy",
      "language", "religion", "travel", "ancient",
    ],
    images: [
      u("photo-1533105079780-92b9be482077"),
      u("photo-1524995997946-a1c2e315a42f"),
      u("photo-1522202176988-66273c2fd55f"),
    ],
  },
  {
    // creativity / design / art
    keywords: [
      "creativity", "creative", "design", "art", "writing",
      "music", "photography", "film", "innovation",
    ],
    images: [
      u("photo-1513364776144-60967b0f800f"),
      u("photo-1460661419201-fd4cecdf8a8b"),
      u("photo-1456513080510-7bf3a84b82f8"),
    ],
  },
  {
    // science / space / nature
    keywords: [
      "science", "physics", "chemistry", "biology", "space",
      "universe", "nature", "environment", "climate", "earth",
    ],
    images: [
      u("photo-1507413245164-6160d8298b31"),
      u("photo-1532094349884-543bc11b234d"),
      u("photo-1446776811953-b23d57bd21aa"),
      u("photo-1441974231531-c6227db76b6e"),
    ],
  },
  {
    // health / body
    keywords: [
      "health", "fitness", "wellness", "food", "nutrition",
      "exercise", "body", "medicine",
    ],
    images: [
      u("photo-1490645935967-10de6ba17061"),
      u("photo-1571019613454-1cb2f99b2d8b"),
    ],
  },
  {
    // business / money / work
    keywords: [
      "business", "money", "finance", "economics", "career",
      "work", "leadership", "productivity", "startup",
    ],
    images: [
      u("photo-1454165804606-c3d57bc86b40"),
      u("photo-1517694712202-14dd9538aa97"),
    ],
  },
  {
    // learning / education
    keywords: ["learning", "education", "study", "knowledge", "books"],
    images: [
      u("photo-1503676260728-1c00da094a0b"),
      u("photo-1456513080510-7bf3a84b82f8"),
    ],
  },
];

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Picks a fallback image that matches the item's label/topics.
 * Hashing the content id keeps the same item on the same image
 * everywhere it appears.
 */
function pickFallbackImage(id: string, topics: string[], label: string) {
  const words = [label, ...topics]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);

  const pool = FALLBACK_POOLS.find((p) =>
    p.keywords.some((k) => words.includes(k)),
  );

  const images = pool?.images ?? GENERIC_IMAGES;

  return images[hashString(id) % images.length];
}

/** Image that falls back to a default if the remote URL fails. */
function RemoteImage({ uri, style }: { uri: string; style: any }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <Image
      source={{ uri: failed ? DEFAULT_IMAGE : uri }}
      style={style}
      accessibilityIgnoresInvertColors
      onError={(e) => {
        warn("RemoteImage", "image failed to load, using default", {
          uri,
          error: e?.nativeEvent?.error,
        });
        setFailed(true);
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

type HeroCardData = {
  id: string;
  label: string;
  category: string;
  minutes: number;
  title: string;
  description: string;
  image: string;
};

type ListItemData = {
  id: string;
  category: string;
  minutes: number;
  title: string;
  image: string;
};

type Category = {
  key: string;
  label: string;
};

const ALL: Category = { key: "all", label: "All" };

type Theme = typeof Colors.light;

function toTitleCase(text: string) {
  return text.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function normalizeLabel(label?: string | null) {
  return (label ?? "").trim().toLowerCase();
}

function formatCategory(topics: string[], label: string) {
  if (label) {
    return toTitleCase(label);
  }

  if (topics.length > 0) {
    return topics[0]
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return "Explore";
}

function formatMinutes(total: number) {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function formatToday() {
  try {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */

const DOUBLE_TAP_DELAY = 300;

/**
 * Double-tap detector. Returns a stable handler that calls
 * `onDoubleTap` when two presses land within DOUBLE_TAP_DELAY.
 * Always calls the latest `onDoubleTap` (no stale closures).
 *
 * `label` is only used for logging.
 */
function useDoubleTap(onDoubleTap: () => void, label = "unknown") {
  const lastTap = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onDoubleTap);
  callback.current = onDoubleTap;

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return useRef(() => {
    const now = Date.now();

    if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
      log("DoubleTap", `✅ double tap on "${label}"`, {
        deltaMs: now - lastTap.current,
      });

      if (timer.current) clearTimeout(timer.current);
      lastTap.current = 0;

      try {
        callback.current();
      } catch (err) {
        console.error(`[Home:DoubleTap] onDoubleTap threw for "${label}":`, err);
      }
    } else {
      log("DoubleTap", `first tap on "${label}", armed`);
      lastTap.current = now;

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (lastTap.current === now) {
          lastTap.current = 0;
        }
      }, DOUBLE_TAP_DELAY + 50);
    }
  }).current;
}

function Avatar({ theme, name }: { theme: Theme; name: string }) {
  return (
    <View
      style={[styles.avatar, { backgroundColor: theme.onboardingBorder }]}
      accessibilityLabel={name ? `Profile, ${name}` : "Profile"}
    >
      <Text style={[styles.avatarText, { color: theme.text }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * A single hero card.
 *
 * The Pressable is the OUTER element (untransformed) so touches stay
 * reliable while the inner Animated.View tilts slightly. The motion is
 * deliberately small: neighbours recede a little (scale, fade, a hint
 * of tilt) so the centred card reads as "the one to read now".
 */
function HeroCard({
  item,
  index,
  theme,
  scrollX,
  read,
  onOpen,
}: {
  item: HeroCardData;
  index: number;
  theme: Theme;
  scrollX: Animated.Value;
  read: boolean;
  onOpen: () => void;
}) {
  const handleTap = useDoubleTap(onOpen, `hero:${item.id}`);

  const inputRange = [
    (index - 1) * HERO_ITEM_SIZE,
    index * HERO_ITEM_SIZE,
    (index + 1) * HERO_ITEM_SIZE,
  ];

  const rotateY = scrollX.interpolate({
    inputRange,
    outputRange: ["10deg", "0deg", "-10deg"],
    extrapolate: "clamp",
  });

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.95, 1, 0.95],
    extrapolate: "clamp",
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.65, 1, 0.65],
    extrapolate: "clamp",
  });

  return (
    <Pressable
      onPress={() => {
        log("HeroCard", `onPress index=${index}`, { id: item.id });
        handleTap();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.category}, ${item.minutes} minute read.${read ? " Already read." : ""}`}
      accessibilityHint="Double tap to open"
      accessibilityActions={[{ name: "activate", label: "Open" }]}
      onAccessibilityAction={onOpen}
      style={styles.heroCardWrap}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.background,
              borderColor: theme.onboardingBorder,
              opacity,
              transform: [{ perspective: 900 }, { scale }, { rotateY }],
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.heroImageWrap}>
            <RemoteImage uri={item.image} style={styles.heroImage} />

            <View
              style={[
                styles.heroLabelPill,
                { backgroundColor: theme.onboardingAccent },
              ]}
            >
              <Text
                style={[styles.heroLabelText, { color: theme.background }]}
              >
                {item.label}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.heroTitle,
              { color: theme.text, fontFamily: Fonts.serif },
            ]}
            numberOfLines={3}
          >
            {item.title}
          </Text>

          <Text
            style={[styles.heroDescription, { color: theme.textSecondary }]}
            numberOfLines={3}
          >
            {item.description}
          </Text>

          <View style={styles.heroFooterRow}>
            {read ? (
              <Text style={[styles.readBadge, { color: theme.textSecondary }]}>
                ✓ Read
              </Text>
            ) : (
              <View
                style={[
                  styles.tapPill,
                  { borderColor: theme.onboardingBorder },
                ]}
              >
                <Text
                  style={[styles.tapPillText, { color: theme.textSecondary }]}
                >
                  ⇢⇢  double tap to open
                </Text>
              </View>
            )}

            <Text style={[styles.heroMeta, { color: theme.textSecondary }]}>
              {item.category} · {item.minutes} min
            </Text>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

function HeroStack({
  theme,
  cards,
  readIds,
  onOpen,
}: {
  theme: Theme;
  cards: HeroCardData[];
  readIds: Set<string>;
  onOpen: (id: string) => void;
}) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true },
  );

  if (cards.length === 0) {
    return null;
  }

  return (
    <View style={styles.heroWrap}>
      <Animated.FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        horizontal
        snapToInterval={HERO_ITEM_SIZE}
        decelerationRate="fast"
        bounces={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.four }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / HERO_ITEM_SIZE,
          );
          setActiveIndex(Math.max(0, Math.min(index, cards.length - 1)));
        }}
        extraData={readIds}
        renderItem={({ item, index }) => (
          <HeroCard
            item={item}
            index={index}
            theme={theme}
            scrollX={scrollX}
            read={readIds.has(item.id)}
            onOpen={() => onOpen(item.id)}
          />
        )}
      />

      <View style={styles.dotsRow}>
        {cards.map((c, i) => (
          <View
            key={c.id}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === activeIndex
                    ? theme.onboardingAccent
                    : theme.onboardingBorder,
                width: i === activeIndex ? 16 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/** Today's progress: one quiet segment per pick, filled once read. */
function TodayProgress({
  theme,
  cards,
  readIds,
  totalMinutes,
}: {
  theme: Theme;
  cards: HeroCardData[];
  readIds: Set<string>;
  totalMinutes: number;
}) {
  const readCount = cards.filter((c) => readIds.has(c.id)).length;
  const done = readCount === cards.length && cards.length > 0;

  return (
    <View style={styles.todayWrap}>
      <View style={styles.todayTextRow}>
        <Text
          style={[
            styles.todayTitle,
            { color: theme.text, fontFamily: Fonts.serif },
          ]}
        >
          Worth your time today
        </Text>

        <Text style={[styles.todayCount, { color: theme.textSecondary }]}>
          {done ? "All read" : `${readCount} of ${cards.length} read`}
        </Text>
      </View>

      <View style={styles.segRow}>
        {cards.map((c) => (
          <View
            key={c.id}
            style={[
              styles.seg,
              {
                backgroundColor: readIds.has(c.id)
                  ? theme.onboardingAccent
                  : theme.onboardingBorder,
              },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.todayHint, { color: theme.textSecondary }]}>
        {done
          ? "You're caught up. Come back tomorrow."
          : `${cards.length} ideas · about ${formatMinutes(totalMinutes)}`}
      </Text>
    </View>
  );
}

function CategoryChips({
  theme,
  categories,
  active,
  onSelect,
}: {
  theme: Theme;
  categories: Category[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {categories.map((cat) => {
        const isActive = cat.key === active;

        return (
          <Pressable
            key={cat.key}
            onPress={() => {
              if (isActive) return;
              log("Chips", `chip selected: ${cat.key}`, { previous: active });
              Haptics.selectionAsync().catch(() => {});
              onSelect(cat.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={[
              styles.chip,
              {
                backgroundColor: isActive
                  ? theme.onboardingAccent
                  : "transparent",
                borderColor: isActive
                  ? theme.onboardingAccent
                  : theme.onboardingBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isActive ? theme.background : theme.text },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ListRow({
  item,
  theme,
  read,
  onOpen,
}: {
  item: ListItemData;
  theme: Theme;
  read: boolean;
  onOpen: () => void;
}) {
  const handleTap = useDoubleTap(onOpen, `list:${item.id}`);

  return (
    <Pressable
      onPress={() => {
        log("ListRow", "onPress", { id: item.id, title: item.title });
        handleTap();
      }}
      accessibilityHint="Double tap to open"
      accessibilityActions={[{ name: "activate", label: "Open" }]}
      onAccessibilityAction={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.category}, ${item.minutes} minute read.${read ? " Already read." : ""}`}
      style={({ pressed }) => [
        styles.listRow,
        { borderBottomColor: theme.onboardingBorder },
        pressed && styles.pressed,
        read && styles.readRow,
      ]}
    >
      <RemoteImage uri={item.image} style={styles.listThumb} />

      <View style={styles.listText}>
        <Text style={[styles.listMeta, { color: theme.textSecondary }]}>
          {item.category} · {item.minutes} min{read ? " · ✓ Read" : ""}
        </Text>

        <Text
          style={[
            styles.listTitle,
            { color: theme.text, fontFamily: Fonts.serif },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
      </View>

      <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/** Static placeholders (no shimmer) so the layout doesn't jump on load. */
function FeedSkeleton({ theme }: { theme: Theme }) {
  const block = { backgroundColor: theme.onboardingBorder };

  return (
    <View accessibilityLabel="Loading your feed">
      <View style={[styles.skelHero, block]} />

      <View style={styles.list}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.listRow, { borderBottomColor: "transparent" }]}
          >
            <View style={[styles.listThumb, block]} />
            <View style={styles.listText}>
              <View style={[styles.skelLineShort, block]} />
              <View style={[styles.skelLine, block]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatusMessage({
  theme,
  message,
  actionLabel,
  onAction,
}: {
  theme: Theme;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.statusContainer}>
      <Text style={[styles.statusText, { color: theme.textSecondary }]}>
        {message}
      </Text>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.retryButton,
            { borderColor: theme.onboardingBorder },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.retryText, { color: theme.text }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function HomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  const [username, setUsername] = useState<string | null>(null);
  const [checkedProfile, setCheckedProfile] = useState(false);

  const [activeCategory, setActiveCategory] = useState(ALL.key);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [content, setContent] = useState<HomeFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";

  const today = useMemo(formatToday, []);

  // Mount / unmount
  useEffect(() => {
    mountedRef.current = true;
    log("Screen", "HomeScreen mounted");
    return () => {
      mountedRef.current = false;
      log("Screen", "HomeScreen unmounted");
    };
  }, []);

  // Load the username; send new users to onboarding.
  useEffect(() => {
    let active = true;

    getUsername()
      .then((name) => {
        if (!active) return;

        if (!name) {
          log("Profile", "no username → redirecting to onboarding");
          router.replace("/(onboarding)/username");
          return;
        }

        log("Profile", "username loaded", { name });
        setUsername(name);
        setCheckedProfile(true);
      })
      .catch((err) => {
        console.error("Failed to load username:", err);

        if (active) {
          setCheckedProfile(true);
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the feed. `refresh` keeps the current content on screen while
  // the new feed loads instead of flashing a skeleton.
  const loadFeed = useCallback(async (mode: "initial" | "refresh") => {
    try {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);

      log("Feed", `loading feed (${mode}, limit=20, offset=0)…`);
      const items = await getHomeContent(20, 0);

      log("Feed", `loaded ${items.length} items`, {
        ids: items.map((i) => i.content_id),
        withoutPayload: items.filter((i) => i.payload == null).length,
        payloadTypes: items.map((i) => typeof i.payload),
      });

      if (mountedRef.current) {
        setContent(items);
      }
    } catch (err) {
      console.error("HOME FEED ERROR:", err);

      if (mountedRef.current) {
        setError("Couldn't load your feed. Check your connection and try again.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadFeed("initial");
  }, [loadFeed]);

  // Chips are built from the labels that actually exist in the list below.
  const categories = useMemo<Category[]>(() => {
    const seen = new Map<string, string>();

    content.slice(HERO_COUNT).forEach((item) => {
      const key = normalizeLabel(item.label);

      if (key && !seen.has(key)) {
        seen.set(key, item.label.trim());
      }
    });

    return [
      ALL,
      ...Array.from(seen, ([key, label]) => ({
        key,
        label: toTitleCase(label),
      })),
    ];
  }, [content]);

  // If a refresh removes the selected label, fall back to "All".
  useEffect(() => {
    if (!categories.some((c) => c.key === activeCategory)) {
      setActiveCategory(ALL.key);
    }
  }, [categories, activeCategory]);

  // Hero carousel: always the top picks for today.
  const heroItems = useMemo(() => content.slice(0, HERO_COUNT), [content]);

  // List below: the rest, filtered by the selected label chip.
  const listSource = useMemo(() => {
    const rest = content.slice(HERO_COUNT);

    if (activeCategory === ALL.key) {
      return rest;
    }

    return rest.filter(
      (item) => normalizeLabel(item.label) === activeCategory,
    );
  }, [content, activeCategory]);

  const heroCards: HeroCardData[] = heroItems.map((item) => ({
    id: item.content_id,
    label: item.label || "Today's idea",
    category: formatCategory(item.topics, item.label),
    minutes: item.estimated_minutes ?? 1,
    title: item.title,
    description: item.summary,
    image: pickFallbackImage(item.content_id, item.topics, item.label),
  }));

  const listItems: ListItemData[] = listSource.map((item) => ({
    id: item.content_id,
    category: formatCategory(item.topics, item.label),
    minutes: item.estimated_minutes ?? 1,
    title: item.title,
    image: pickFallbackImage(item.content_id, item.topics, item.label),
  }));

  const totalMinutes = heroCards.reduce((sum, c) => sum + c.minutes, 0);

  const activeCategoryLabel =
    categories.find((c) => c.key === activeCategory)?.label ?? ALL.label;

  const openContent = (id: string) => {
    log("Open", "openContent called", { id, feedSize: content.length });

    const selectedItem = content.find((item) => item.content_id === id);

    if (!selectedItem) {
      warn("Open", "❌ content NOT FOUND for id. Aborting navigation.", {
        id,
        availableIds: content.map((c) => c.content_id),
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Build the payload string
    const rawPayload = selectedItem.payload;
    const payloadString =
      typeof rawPayload === "string"
        ? rawPayload
        : JSON.stringify(rawPayload ?? {});

    if (rawPayload == null) {
      warn("Open", "payload is null/undefined, falling back to '{}'", { id });
    }

    const payloadIsValidJson = isValidJson(payloadString);

    log("Open", "payload serialized", {
      originalType: typeof rawPayload,
      length: payloadString.length,
      validJson: payloadIsValidJson,
      preview: preview(payloadString),
    });

    if (!payloadIsValidJson) {
      warn(
        "Open",
        "⚠️ payload is NOT valid JSON, the detail screen may fail to parse it",
        { id, preview: preview(payloadString, 300) },
      );
    }

    // Route params have practical size limits on some platforms
    if (payloadString.length > 20_000) {
      warn("Open", "⚠️ payload is very large for a route param (>20k chars)", {
        id,
        length: payloadString.length,
      });
    }

    const params = {
      id: selectedItem.content_id,
      title: selectedItem.title,
      label: selectedItem.label ?? "",
      summary: selectedItem.summary ?? "",
      readTime: String(selectedItem.estimated_minutes ?? 1),
      topics: JSON.stringify(selectedItem.topics ?? []),
      payload: payloadString,
    };

    log("Open", "➡️ router.push /deep-dive/[id]", {
      pathname: "/deep-dive/[id]",
      params: { ...params, payload: preview(params.payload, 120) },
    });

    try {
      router.push({
        pathname: "/deep-dive/[id]",
        params,
      });
    } catch (err) {
      console.error("[Home:Open] ❌ router.push threw:", err, { id });
    }
  };

  // Avoid flashing the feed before a possible onboarding redirect.
  // (Must stay after all hooks.)
  if (!checkedProfile) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadFeed("refresh")}
          tintColor={theme.textSecondary}
        />
      }
    >
      {/* Header */}

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text
            style={[
              styles.brand,
              { color: theme.text, fontFamily: Fonts.serif },
            ]}
          >
            euno
          </Text>

          <Avatar theme={theme} name={username ?? ""} />
        </View>

        <Text
          style={[
            styles.greeting,
            { color: theme.text, fontFamily: Fonts.serif },
          ]}
        >
          {greeting}
          {username ? `, ${username}` : ""}
        </Text>

        {today ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {today}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <FeedSkeleton theme={theme} />
      ) : error && content.length === 0 ? (
        <StatusMessage
          theme={theme}
          message={error}
          actionLabel="Try again"
          onAction={() => loadFeed("initial")}
        />
      ) : content.length === 0 ? (
        <StatusMessage
          theme={theme}
          message="Nothing new yet. Pull down to refresh."
        />
      ) : (
        <>
          {/* Today's picks */}

          <TodayProgress
            theme={theme}
            cards={heroCards}
            readIds={readIds}
            totalMinutes={totalMinutes}
          />

          <HeroStack
            theme={theme}
            cards={heroCards}
            readIds={readIds}
            onOpen={openContent}
          />

          {/* More to explore */}

          {listSource.length > 0 || activeCategory !== ALL.key ? (
            <>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.text, fontFamily: Fonts.serif },
                  ]}
                >
                  {activeCategory === ALL.key
                    ? "More to explore"
                    : activeCategoryLabel}
                </Text>

                <Text
                  style={[styles.sectionCount, { color: theme.textSecondary }]}
                >
                  {listItems.length} {listItems.length === 1 ? "idea" : "ideas"}
                </Text>
              </View>

              {categories.length > 2 ? (
                <CategoryChips
                  theme={theme}
                  categories={categories}
                  active={activeCategory}
                  onSelect={setActiveCategory}
                />
              ) : null}

              <View style={styles.list}>
                {listItems.length === 0 ? (
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: theme.textSecondary,
                        paddingVertical: Spacing.three,
                      },
                    ]}
                  >
                    Nothing here yet.
                  </Text>
                ) : (
                  listItems.map((item) => (
                    <ListRow
                      key={item.id}
                      item={item}
                      theme={theme}
                      read={readIds.has(item.id)}
                      onOpen={() => openContent(item.id)}
                    />
                  ))
                )}
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingBottom: Spacing.six,
  },

  pressed: {
    opacity: 0.85,
  },

  // Status

  statusContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    alignItems: "center",
  },

  statusText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  retryButton: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },

  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Skeleton

  skelHero: {
    height: 330,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.five,
    borderRadius: 22,
    opacity: 0.5,
  },

  skelLineShort: {
    width: "40%",
    height: 10,
    borderRadius: 5,
    marginBottom: 10,
    opacity: 0.5,
  },

  skelLine: {
    width: "85%",
    height: 14,
    borderRadius: 7,
    opacity: 0.5,
  },

  // Header

  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.four,
  },

  brand: {
    fontSize: 24,
    fontWeight: "600",
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 14,
    fontWeight: "600",
  },

  greeting: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
  },

  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },

  // Today's progress

  todayWrap: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },

  todayTextRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: Spacing.two,
  },

  todayTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  todayCount: {
    fontSize: 12,
    fontWeight: "500",
  },

  segRow: {
    flexDirection: "row",
    gap: 4,
  },

  seg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },

  todayHint: {
    fontSize: 12,
    marginTop: Spacing.two,
  },

  // Hero

  heroWrap: {
    marginBottom: Spacing.five,
  },

  heroCardWrap: {
    width: HERO_WIDTH,
    marginRight: HERO_SPACING,
  },

  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.four,
  },

  heroImageWrap: {
    marginBottom: Spacing.three,
  },

  heroImage: {
    width: "100%",
    height: 150,
    borderRadius: 16,
  },

  heroLabelPill: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  heroLabelText: {
    fontSize: 11,
    fontWeight: "700",
  },

  heroTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "600",
    marginBottom: 6,
  },

  heroDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.three,
  },

  heroFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroMeta: {
    fontSize: 12,
  },

  tapPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  tapPillText: {
    fontSize: 11,
    fontWeight: "500",
  },

  readBadge: {
    fontSize: 12,
    fontWeight: "500",
  },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: Spacing.three,
  },

  dot: {
    height: 6,
    borderRadius: 3,
  },

  // Section header

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  sectionCount: {
    fontSize: 12,
  },

  // Chips

  chipRow: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },

  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // List

  list: {
    paddingHorizontal: Spacing.four,
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  readRow: {
    opacity: 0.6,
  },

  listThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },

  listText: {
    flex: 1,
  },

  listMeta: {
    fontSize: 12,
    marginBottom: 4,
  },

  listTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
  },

  chevron: {
    fontSize: 22,
    marginTop: -2,
  },
});
