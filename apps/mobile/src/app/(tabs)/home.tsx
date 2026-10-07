import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  useColorScheme,
} from "react-native";

import {
  Colors,
  Fonts,
  Spacing,
} from "@/constants/theme";
import {
  getHomeContent,
  type HomeFeedItem,
} from "@/lib/content";

const USER_NAME = "Tarun";
const DOUBLE_TAP_DELAY = 300;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HERO_WIDTH = SCREEN_WIDTH - Spacing.four * 2;
const HERO_SPACING = Spacing.two;
const HERO_ITEM_SIZE = HERO_WIDTH + HERO_SPACING;

/* ------------------------------------------------------------------ */
/* Fallback images, grouped by topic / label keywords                  */
/* ------------------------------------------------------------------ */

const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=900`;

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
 * Uses a hash of the content id so the same item always gets the
 * same image (in the hero and in the list).
 */
function pickFallbackImage(
  id: string,
  topics: string[],
  label: string,
) {
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
function RemoteImage({
  uri,
  style,
}: {
  uri: string;
  style: any;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <Image
      source={{ uri: failed ? DEFAULT_IMAGE : uri }}
      style={style}
      onError={() => setFailed(true)}
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
  readTime: string;
  title: string;
  description: string;
  image: string;
};

type ListItemData = {
  id: string;
  category: string;
  readTime: string;
  title: string;
  image: string;
};

type Category = {
  key: string;
  label: string;
  icon: string;
};

const FOR_YOU: Category = {
  key: "for-you",
  label: "For you",
  icon: "◎",
};

const CHIP_ICONS = ["◐", "▣", "◈", "✦", "◎"];

type Theme = typeof Colors.light;

function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function normalizeLabel(label?: string | null) {
  return (label ?? "").trim().toLowerCase();
}

function formatCategory(topics: string[], label: string) {
  if (label) {
    return label;
  }

  if (topics.length > 0) {
    return topics[0]
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return "Explore";
}

/**
 * Double-tap detector. Returns a stable handler that calls
 * `onDoubleTap` when two presses land within DOUBLE_TAP_DELAY.
 * Always calls the latest `onDoubleTap` (no stale closures).
 */
function useDoubleTap(onDoubleTap: () => void) {
  const lastTap = useRef(0);
  const callback = useRef(onDoubleTap);
  callback.current = onDoubleTap;

  return useRef(() => {
    const now = Date.now();

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      lastTap.current = 0;
      callback.current();
    } else {
      lastTap.current = now;
    }
  }).current;
}

function Avatar({ theme }: { theme: Theme }) {
  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: theme.onboardingBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          {
            color: theme.text,
          },
        ]}
      >
        {USER_NAME.charAt(0)}
      </Text>
    </View>
  );
}

/**
 * A single hero card.
 *
 * The Pressable is the OUTER element (untransformed) so touches
 * keep working while the inner Animated.View is rotated in 3D.
 * Hit-testing on rotated views is unreliable, which is what broke
 * double tap before.
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
  const handleTap = useDoubleTap(onOpen);

  const inputRange = [
    (index - 1) * HERO_ITEM_SIZE,
    index * HERO_ITEM_SIZE,
    (index + 1) * HERO_ITEM_SIZE,
  ];

  const rotateY = scrollX.interpolate({
    inputRange,
    outputRange: ["55deg", "0deg", "-55deg"],
    extrapolate: "clamp",
  });

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.86, 1, 0.86],
    extrapolate: "clamp",
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.5, 1, 0.5],
    extrapolate: "clamp",
  });

  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: [10, 0, 10],
    extrapolate: "clamp",
  });

  return (
    <Pressable
      onPress={handleTap}
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
              transform: [
                { perspective: 900 },
                { scale },
                { translateY },
                { rotateY },
              ],
            },
            pressed && styles.pressed,
          ]}
        >
          <RemoteImage
            uri={item.image}
            style={styles.heroImage}
          />

          <View
            style={[
              styles.heroLabelPill,
              {
                backgroundColor: theme.onboardingAccent,
              },
            ]}
          >
            <Text
              style={[
                styles.heroLabelText,
                {
                  color: theme.background,
                },
              ]}
            >
              {item.label}
            </Text>
          </View>

          <Text
            style={[
              styles.heroMeta,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            {item.category} · {item.readTime}
            {read ? " · Read" : ""}
          </Text>

          <Text
            style={[
              styles.heroTitle,
              {
                color: theme.text,
                fontFamily: Fonts.serif,
              },
            ]}
          >
            {item.title}
          </Text>

          <Text
            style={[
              styles.heroDescription,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            {item.description}
          </Text>

          <View
            style={[
              styles.tapPill,
              {
                borderColor: theme.onboardingBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.tapPillText,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              ⇢⇢  double tap to open
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
    [
      {
        nativeEvent: {
          contentOffset: {
            x: scrollX,
          },
        },
      },
    ],
    {
      useNativeDriver: true,
      listener: (e: any) => {
        const index = Math.round(
          e.nativeEvent.contentOffset.x / HERO_ITEM_SIZE,
        );

        if (index !== activeIndex) {
          setActiveIndex(index);
        }
      },
    },
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
        contentContainerStyle={{
          paddingHorizontal: Spacing.four,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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

      <View style={styles.heroFooter}>
        <View style={styles.dotsRow}>
          {cards.map((_, i) => (
            <View
              key={i}
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

        <Text
          style={[
            styles.pageFraction,
            {
              color: theme.textSecondary,
            },
          ]}
        >
          {activeIndex + 1} / {cards.length}
        </Text>
      </View>
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
            onPress={() => onSelect(cat.key)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive
                  ? theme.onboardingAccent
                  : theme.onboardingBorder,
              },
            ]}
          >
            <Text
              style={{
                color: isActive
                  ? theme.background
                  : theme.text,
                fontSize: 13,
              }}
            >
              {cat.icon}
            </Text>

            <Text
              style={[
                styles.chipText,
                {
                  color: isActive
                    ? theme.background
                    : theme.text,
                },
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
  const handleTap = useDoubleTap(onOpen);

  return (
    <Pressable
      onPress={handleTap}
      style={({ pressed }) => [
        styles.listRow,
        pressed && styles.pressed,
        read && styles.readRow,
      ]}
    >
      <RemoteImage
        uri={item.image}
        style={styles.listThumb}
      />

      <View style={styles.listText}>
        <Text
          style={[
            styles.listMeta,
            {
              color: theme.textSecondary,
            },
          ]}
        >
          {item.category} · {item.readTime}
          {read ? " · Read" : ""}
        </Text>

        <Text
          style={[
            styles.listTitle,
            {
              color: theme.text,
              fontFamily: Fonts.serif,
            },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
      </View>

      <View
        style={[
          styles.arrowCircle,
          {
            backgroundColor: theme.onboardingBorder,
          },
        ]}
      >
        <Text
          style={[
            styles.arrowText,
            {
              color: theme.text,
            },
          ]}
        >
          ›
        </Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  const [activeCategory, setActiveCategory] =
    useState(FOR_YOU.key);

  const [readIds, setReadIds] =
    useState<Set<string>>(new Set());

  const [content, setContent] =
    useState<HomeFeedItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";

  useEffect(() => {
    let mounted = true;

    async function loadHome() {
      try {
        setLoading(true);
        setError(null);

        const items = await getHomeContent(20, 0);

        if (mounted) {
          setContent(items);
        }
      } catch (err) {
        console.error("HOME FEED ERROR:", err);

        if (mounted) {
          setError("Unable to load your feed.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadHome();

    return () => {
      mounted = false;
    };
  }, []);

  // Chips are built from the labels that actually exist in the content.
  const categories = useMemo<Category[]>(() => {
    const seen = new Map<string, string>();

    content.forEach((item) => {
      const key = normalizeLabel(item.label);

      if (key && !seen.has(key)) {
        seen.set(key, item.label.trim());
      }
    });

    return [
      FOR_YOU,
      ...Array.from(seen, ([key, label], i) => ({
        key,
        label: toTitleCase(label),
        icon: CHIP_ICONS[i % CHIP_ICONS.length],
      })),
    ];
  }, [content]);

  // Hero carousel: always the top 5 items.
  const heroItems = useMemo(
    () => content.slice(0, 5),
    [content],
  );

  // List below: the rest, filtered by the selected label chip.
  const listSource = useMemo(() => {
    const rest = content.slice(5);

    if (activeCategory === FOR_YOU.key) {
      return rest;
    }

    return rest.filter(
      (item) =>
        normalizeLabel(item.label) === activeCategory,
    );
  }, [content, activeCategory]);

  const heroCards: HeroCardData[] = heroItems.map(
    (item) => ({
      id: item.content_id,
      label: item.label || "TODAY'S IDEA",
      category: formatCategory(
        item.topics,
        item.label,
      ),
      readTime: `${item.estimated_minutes} min`,
      title: item.title,
      description: item.summary,
      image: pickFallbackImage(
        item.content_id,
        item.topics,
        item.label,
      ),
    }),
  );

  const listItems: ListItemData[] = listSource.map(
    (item) => ({
      id: item.content_id,
      category: formatCategory(
        item.topics,
        item.label,
      ),
      readTime: `${item.estimated_minutes} min`,
      title: item.title,
      image: pickFallbackImage(
        item.content_id,
        item.topics,
        item.label,
      ),
    }),
  );

  const openContent = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));

    console.log("Open topic:", id);

    // TODO:
    // Navigate to the real content detail screen, e.g.
    // router.push({ pathname: "/content/[id]", params: { id } });
  };

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text
            style={[
              styles.brand,
              {
                color: theme.text,
                fontFamily: Fonts.serif,
              },
            ]}
          >
            euno
          </Text>

          <Avatar theme={theme} />
        </View>

        <Text
          style={[
            styles.greeting,
            {
              color: theme.text,
              fontFamily: Fonts.serif,
            },
          ]}
        >
          {greeting}, {USER_NAME}
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: theme.textSecondary,
            },
          ]}
        >
          Small ideas. Big shifts.
        </Text>
      </View>

      {loading ? (
        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.statusText,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Finding something worth knowing...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.statusText,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            {error}
          </Text>
        </View>
      ) : content.length === 0 ? (
        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.statusText,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Nothing new yet.
          </Text>
        </View>
      ) : (
        <>
          {/* Hero stack */}

          <HeroStack
            theme={theme}
            cards={heroCards}
            readIds={readIds}
            onOpen={openContent}
          />

          {/* Category chips (from content labels) */}

          <CategoryChips
            theme={theme}
            categories={categories}
            active={activeCategory}
            onSelect={setActiveCategory}
          />

          {/* More for you */}

          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionIcon,
                {
                  color: theme.onboardingAccent,
                },
              ]}
            >
              ✦
            </Text>

            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.text,
                    fontFamily: Fonts.serif,
                  },
                ]}
              >
                More for you
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                Based on your reading
              </Text>
            </View>
          </View>

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

  statusContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    alignItems: "center",
  },

  statusText: {
    fontSize: 14,
  },

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
    fontWeight: "600",
  },

  subtitle: {
    fontSize: 14,
    marginTop: 4,
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
    backfaceVisibility: "hidden",
  },

  pressed: {
    opacity: 0.85,
  },

  heroImage: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    marginBottom: Spacing.three,
  },

  heroLabelPill: {
    position: "absolute",
    top: Spacing.four + 10,
    left: Spacing.four + 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  heroLabelText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  heroMeta: {
    fontSize: 12,
    marginBottom: 6,
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

  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.four,
  },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  dot: {
    height: 6,
    borderRadius: 3,
  },

  pageFraction: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Chips

  chipRow: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 9,
    borderRadius: 999,
  },

  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Section header

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },

  sectionIcon: {
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  sectionSubtitle: {
    fontSize: 12,
    marginTop: 1,
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
  },

  readRow: {
    opacity: 0.55,
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

  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  arrowText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: -1,
  },
});
