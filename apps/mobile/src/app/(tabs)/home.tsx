import { useRef, useState } from "react";
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
import { useEffect } from "react";
import { getHomeContent } from "@/lib/content";
import { supabase } from "@/lib/supabase";

const USER_NAME = "Tarun";
const DOUBLE_TAP_DELAY = 280;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_WIDTH = SCREEN_WIDTH - Spacing.four * 2;
const HERO_SPACING = Spacing.two;
const HERO_ITEM_SIZE = HERO_WIDTH + HERO_SPACING;

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

const HERO_CARDS: HeroCardData[] = [
  {
    id: "h1",
    label: "TODAY'S IDEA",
    category: "Psychology",
    readTime: "2 min",
    title: "Why your brain craves an answer before it knows what the question is.",
    description:
      "It's not a flaw — it's how your mind keeps you engaged. Here's the science behind it.",
    image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=900",
  },
  {
    id: "h2",
    label: "TODAY'S IDEA",
    category: "Neuroscience",
    readTime: "3 min",
    title: "The 20-minute rule your focus actually follows.",
    description:
      "Attention doesn't fade evenly — it drops in a pattern you can plan around.",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900",
  },
  {
    id: "h3",
    label: "TODAY'S IDEA",
    category: "Habits",
    readTime: "2 min",
    title: "Why small wins feel bigger than they are.",
    description:
      "A look at the reward loop behind checklists, streaks, and 'just one more'.",
    image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=900",
  },
  {
    id: "h4",
    label: "TODAY'S IDEA",
    category: "Technology",
    readTime: "4 min",
    title: "Why AI feels more intelligent when it explains its reasoning.",
    description:
      "It's not just what it says — it's how it tells you. Here's what makes it land.",
    image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=900",
  },
  {
    id: "h5",
    label: "TODAY'S IDEA",
    category: "Psychology",
    readTime: "2 min",
    title: "Your brain doesn't actually 'multitask' the way you think.",
    description:
      "It's not doing two things at once — it's switching. And that changes everything.",
    image: "https://images.unsplash.com/photo-1551244072-5d12893278ab?w=900",
  },
];

const CATEGORIES = [
  { key: "for-you", label: "For you", icon: "◎" },
  { key: "mind", label: "Mind", icon: "◐" },
  { key: "tech", label: "Tech", icon: "▣" },
  { key: "culture", label: "Culture", icon: "◈" },
  { key: "creativity", label: "Creativity", icon: "✦" },
];

const LIST_ITEMS: ListItemData[] = [
  {
    id: "l1",
    category: "Science",
    readTime: "1 min",
    title: "Octopuses have something surprisingly close to a second brain.",
    image: "https://images.unsplash.com/photo-1551244072-5d12893278ab?w=400",
  },
  {
    id: "l2",
    category: "Technology",
    readTime: "4 min",
    title: "Why AI feels more intelligent when it explains its reasoning.",
    image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400",
  },
  {
    id: "l3",
    category: "Technology",
    readTime: "3 min",
    title: "The strange reason modern search engines are changing.",
    image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400",
  },
  {
    id: "l4",
    category: "Psychology",
    readTime: "2 min",
    title: "Your brain doesn't actually 'multitask' the way you think.",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400",
  },
];

type Theme = typeof Colors.light;

function useDoubleTap(onDoubleTap: () => void) {
  const lastTap = useRef(0);
  return () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      onDoubleTap();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };
}

function Avatar({ theme }: { theme: Theme }) {
  return (
    <View style={[styles.avatar, { backgroundColor: theme.onboardingBorder }]}>
      <Text style={[styles.avatarText, { color: theme.text }]}>
        {USER_NAME.charAt(0)}
      </Text>
    </View>
  );
}

/**
 * A single hero card. `scrollX` + `index` let it compute its own
 * flip/scale/depth transform relative to how far it is from center.
 */
function HeroCard({
  item,
  index,
  theme,
  scrollX,
  onOpen,
}: {
  item: HeroCardData;
  index: number;
  theme: Theme;
  scrollX: Animated.Value;
  onOpen: () => void;
}) {
  const handleTap = useDoubleTap(onOpen);

  const inputRange = [
    (index - 1) * HERO_ITEM_SIZE,
    index * HERO_ITEM_SIZE,
    (index + 1) * HERO_ITEM_SIZE,
  ];

  // Card "flips" on its Y axis as it leaves/enters center, like a page turning.
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

  // Slight vertical lift for the centered card, so it "pops" forward.
  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: [10, 0, 10],
    extrapolate: "clamp",
  });


useEffect(() => {
  const test = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    console.log("HOME SESSION USER:", session?.user?.id ?? null);
    console.log("HOME SESSION ERROR:", error);

    const { data, error: contentError } = await supabase
      .from("content_items")
      .select("*")
      .eq("status", "published");

    console.log("HOME CONTENT:", data);
    console.log("HOME CONTENT ERROR:", contentError);
  };

  test();
}, []);
  return (
    <Animated.View
      style={[
        styles.heroCardWrap,
        {
          opacity,
          transform: [
            { perspective: 900 },
            { scale },
            { translateY },
            { rotateY },
          ],
        },
      ]}
    >
      <Pressable
        onPress={handleTap}
        style={({ pressed }) => [
          styles.heroCard,
          { backgroundColor: theme.background, borderColor: theme.onboardingBorder },
          pressed && styles.pressed,
        ]}
      >
        <Image source={{ uri: item.image }} style={styles.heroImage} />

        <View style={[styles.heroLabelPill, { backgroundColor: theme.onboardingAccent }]}>
          <Text style={[styles.heroLabelText, { color: theme.background }]}>
            {item.label}
          </Text>
        </View>

        <Text style={[styles.heroMeta, { color: theme.textSecondary }]}>
          {item.category} · {item.readTime}
        </Text>

        <Text
          style={[styles.heroTitle, { color: theme.text, fontFamily: Fonts.serif }]}
        >
          {item.title}
        </Text>

        <Text style={[styles.heroDescription, { color: theme.textSecondary }]}>
          {item.description}
        </Text>

        <View style={[styles.tapPill, { borderColor: theme.onboardingBorder }]}>
          <Text style={[styles.tapPillText, { color: theme.textSecondary }]}>
            ⇢⇢  double tap to open
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function HeroStack({
  theme,
  onOpen,
}: {
  theme: Theme;
  onOpen: (id: string) => void;
}) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (e: any) => {
        const index = Math.round(
          e.nativeEvent.contentOffset.x / HERO_ITEM_SIZE
        );
        if (index !== activeIndex) setActiveIndex(index);
      },
    }
  );

  return (
    <View style={styles.heroWrap}>
      <Animated.FlatList
        data={HERO_CARDS}
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
        renderItem={({ item, index }) => (
          <HeroCard
            item={item}
            index={index}
            theme={theme}
            scrollX={scrollX}
            onOpen={() => onOpen(item.id)}
          />
        )}
      />

      <View style={styles.heroFooter}>
        <View style={styles.dotsRow}>
          {HERO_CARDS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === activeIndex ? theme.onboardingAccent : theme.onboardingBorder,
                  width: i === activeIndex ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.pageFraction, { color: theme.textSecondary }]}>
          {activeIndex + 1} / {HERO_CARDS.length}
        </Text>
      </View>
    </View>
  );
}

function CategoryChips({
  theme,
  active,
  onSelect,
}: {
  theme: Theme;
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {CATEGORIES.map((cat) => {
        const isActive = cat.key === active;
        return (
          <Pressable
            key={cat.key}
            onPress={() => onSelect(cat.key)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? theme.onboardingAccent : theme.onboardingBorder,
              },
            ]}
          >
            <Text style={{ color: isActive ? theme.background : theme.text, fontSize: 13 }}>
              {cat.icon}
            </Text>
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
      <Image source={{ uri: item.image }} style={styles.listThumb} />

      <View style={styles.listText}>
        <Text style={[styles.listMeta, { color: theme.textSecondary }]}>
          {item.category} · {item.readTime}
          {read ? " · Read" : ""}
        </Text>
        <Text
          style={[styles.listTitle, { color: theme.text, fontFamily: Fonts.serif }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
      </View>

      <View style={[styles.arrowCircle, { backgroundColor: theme.onboardingBorder }]}>
        <Text style={[styles.arrowText, { color: theme.text }]}>›</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  const [activeCategory, setActiveCategory] = useState("for-you");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const markRead = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    console.log("Open topic:", id); // TODO: navigate to topic detail screen
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.brand, { color: theme.text, fontFamily: Fonts.serif }]}>
            euno
          </Text>
          <Avatar theme={theme} />
        </View>

        <Text style={[styles.greeting, { color: theme.text, fontFamily: Fonts.serif }]}>
          {greeting}, {USER_NAME}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Small ideas. Big shifts.
        </Text>
      </View>

      {/* Hero stack */}
      <HeroStack theme={theme} onOpen={markRead} />

      {/* Category chips */}
      <CategoryChips theme={theme} active={activeCategory} onSelect={setActiveCategory} />

      {/* More for you */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionIcon, { color: theme.onboardingAccent }]}>✦</Text>
        <View>
          <Text
            style={[styles.sectionTitle, { color: theme.text, fontFamily: Fonts.serif }]}
          >
            More for you
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Based on your reading
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {LIST_ITEMS.map((item) => (
          <ListRow
            key={item.id}
            item={item}
            theme={theme}
            read={readIds.has(item.id)}
            onOpen={() => markRead(item.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: Spacing.six },

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

  brand: { fontSize: 24, fontWeight: "600" },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: { fontSize: 14, fontWeight: "600" },

  greeting: { fontSize: 28, fontWeight: "600" },

  subtitle: { fontSize: 14, marginTop: 4 },

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

  pressed: { opacity: 0.85 },

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

  heroMeta: { fontSize: 12, marginBottom: 6 },

  heroTitle: { fontSize: 21, lineHeight: 27, fontWeight: "600", marginBottom: 6 },

  heroDescription: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.three },

  tapPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  tapPillText: { fontSize: 11, fontWeight: "500" },

  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.four,
  },

  dotsRow: { flexDirection: "row", alignItems: "center", gap: 5 },

  dot: { height: 6, borderRadius: 3 },

  pageFraction: { fontSize: 12, fontWeight: "500" },

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

  chipText: { fontSize: 13, fontWeight: "600" },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },

  sectionIcon: { fontSize: 16 },

  sectionTitle: { fontSize: 18, fontWeight: "600" },

  sectionSubtitle: { fontSize: 12, marginTop: 1 },

  // List
  list: { paddingHorizontal: Spacing.four },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },

  readRow: { opacity: 0.55 },

  listThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },

  listText: { flex: 1 },

  listMeta: { fontSize: 12, marginBottom: 4 },

  listTitle: { fontSize: 16, lineHeight: 21, fontWeight: "600" },

  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  arrowText: { fontSize: 18, fontWeight: "600", marginTop: -1 },
});
