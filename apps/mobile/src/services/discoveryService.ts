/**
 * discoveryService.ts
 *
 * All "Flow" content is fetched through this one service. The screen
 * never touches mock data directly — it only calls `discoveryService`.
 *
 * TO SWITCH TO A REAL BACKEND:
 *   1. Write a class that implements `DiscoveryService` (see the
 *      `ApiDiscoveryService` sketch at the bottom of this file).
 *   2. Change the final export to `new ApiDiscoveryService()`.
 *   Nothing in flow.tsx needs to change.
 */

export type Discovery = {
  id: string;
  category: string;
  readTime: string;
  title: string;
  description: string;
  image?: string;
  gradient?: [string, string];
  /** Revealed when the user dives in (tap "Why?" or swipe right). */
  question?: string;
  /**
   * The three curiosity directions offered once a card is expanded.
   * In mock data these advance to the next card in the deck; a real
   * backend would resolve each key to a discovery matched to that angle.
   */
  branches?: { why: string; how: string; whatIf: string };
  /** Renders the special "A Connection" layout instead of the normal card. */
  isConnection?: boolean;
  connectionTags?: [string, string];
};

export interface DiscoveryService {
  /** Fetch the deck for a topic filter ("All" or a specific category). */
  getDiscoveries(filter: string): Promise<Discovery[]>;
}

// ─────────────────────────────────────────────────────────────────────────
// Mock data (stand-in for the real backend)
// ─────────────────────────────────────────────────────────────────────────

const MOCK_DISCOVERIES: Discovery[] = [
  {
    id: "d1",
    category: "Science",
    readTime: "2 min",
    title: "Octopuses\nhave three\nhearts.",
    description:
      "Two pump blood to the gills. The third pumps it everywhere else — and it stops beating the moment they swim.",
    question:
      "Octopus blood is copper-based rather than iron-based, so it needs extra pressure to carry oxygen efficiently through their bodies.",
    branches: {
      why: "Why copper instead of iron?",
      how: "How does copper-based blood work?",
      whatIf: "What if human blood ran on copper?",
    },
    image: "https://images.unsplash.com/photo-1637308116533-08501939a944?w=900",
  },
  {
    id: "d2",
    category: "Space",
    readTime: "3 min",
    title: "A day on\nVenus is\nlonger than\nits year.",
    description:
      "Venus spins so slowly that it takes longer to rotate once than to complete a full trip around the Sun.",
    question:
      "Venus likely spins backwards and at a crawl because of a massive ancient collision, or a long gravitational tug-of-war with the Sun.",
    branches: {
      why: "Why does Venus spin backwards?",
      how: "How was its rotation measured?",
      whatIf: "What if Earth spun this slowly?",
    },
    image: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=900",
  },
  {
    id: "d3",
    category: "Psychology",
    readTime: "2 min",
    title: "Your brain\nedits your\nmemories\nevery time you\nrecall them.",
    description:
      "Each time a memory is retrieved, it's quietly rewritten — not replayed. That's part of why memories drift over the years.",
    question:
      "Recalling a memory makes it briefly unstable, open to being altered by your current mood, new information, or the act of retelling it.",
    branches: {
      why: "Why does recall cause rewriting?",
      how: "How do false memories form this way?",
      whatIf: "What if memory worked like a file instead?",
    },
    image: "https://images.unsplash.com/photo-1617791160536-598cf32026fb?w=900",
  },
  {
    id: "d4",
    category: "Technology",
    readTime: "3 min",
    title: "AI doesn't\nunderstand\nlanguage the\nway you do.",
    description:
      "It predicts the next likely word, over and over — with no lived concept of what any of it actually means.",
    question:
      "Language models learn statistical patterns from enormous amounts of text, so fluent output can appear without anything like human understanding underneath it.",
    branches: {
      why: "Why does prediction look like understanding?",
      how: "How do models decide what's 'likely' next?",
      whatIf: "What if meaning isn't required for usefulness?",
    },
    image: "https://images.unsplash.com/photo-1750365919971-7dd273e7b317?w=900",
  },
  {
    id: "d5",
    category: "Nature",
    readTime: "2 min",
    title: "Trees warn\neach other\nthrough\nunderground\nfungal\nnetworks.",
    description:
      "Some call it the 'wood wide web' — a hidden network quietly moving nutrients, water, and warning signals between trees.",
    question:
      "Thread-like fungi called mycorrhizae connect tree root systems, letting chemical signals and resources pass between plants that share the network.",
    branches: {
      why: "Why would trees share resources at all?",
      how: "How do the fungi benefit from this?",
      whatIf: "What if forests behave more like one organism?",
    },
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900",
  },
  {
    id: "d6",
    category: "History",
    readTime: "2 min",
    title: "Cleopatra\nlived closer to\nthe Moon landing\nthan to the\nbuilding of the\npyramids.",
    description:
      "Over 2,000 years separate her from the Great Pyramid. Fewer than 2,000 separate her from 1969.",
    question:
      "The pyramids were already ancient history to the Egypt Cleopatra ruled — her world was as distant from them as ours is from the Roman Empire.",
    branches: {
      why: "Why does this timeline feel so wrong?",
      how: "How old is human civilization, really?",
      whatIf: "What if we mapped history by lifetimes instead of years?",
    },
    image: "https://images.unsplash.com/photo-1706651785622-5500a55197ed?w=900",
  },
  {
    id: "d7",
    category: "Science",
    readTime: "2 min",
    title: "Whales sleep\nwith half\ntheir brain\nawake.",
    description:
      "They keep one hemisphere alert enough to surface, breathe, and stay aware of predators — while the other half rests.",
    question:
      "Because whales are voluntary breathers, falling fully unconscious could mean drowning — so evolution split the difference: half-brain sleep.",
    branches: {
      why: "Why can't they just breathe reflexively?",
      how: "How do dolphins and orcas compare?",
      whatIf: "What if humans could sleep this way?",
    },
    image: "https://images.unsplash.com/photo-1698557308866-d0d4dfcf3fb6?w=900",
  },
  {
    id: "d8",
    category: "Psychology",
    readTime: "2 min",
    title: "You don't\nmultitask —\nyou switch,\nfast.",
    description:
      "Your brain isn't running two things at once. It's rapidly toggling focus — and paying a small cost every single time.",
    question:
      "Each switch requires reloading context for the new task, which is why 'multitasking' quietly makes everything slower and more error-prone.",
    branches: {
      why: "Why does switching feel seamless anyway?",
      how: "How much time does each switch actually cost?",
      whatIf: "What if you designed your day around single-tasking?",
    },
    gradient: ["#1a1226", "#05040a"],
  },
  {
    id: "d9",
    category: "Technology",
    readTime: "2 min",
    title: "The most\nconfident AI\nanswer is often\nnot the most\ncorrect one.",
    description:
      "Confidence in how something is said has almost nothing to do with whether it's true — for people or for models.",
    question:
      "Language models are optimized to sound fluent and coherent, which is a different objective entirely from being factually correct.",
    branches: {
      why: "Why is fluency easier to optimize than truth?",
      how: "How can you tell confident from correct?",
      whatIf: "What if models could show their uncertainty?",
    },
    gradient: ["#131b2e", "#04050b"],
  },
  {
    id: "d10",
    category: "Nature",
    readTime: "3 min",
    title: "A single\nteaspoon of\nsoil holds more\norganisms than\nthere are\npeople on\nEarth.",
    description:
      "Billions of bacteria, fungi, and microbes — an entire invisible city under every footstep.",
    question:
      "Healthy soil is one of the densest ecosystems on the planet, and most of what happens in it still isn't fully mapped by science.",
    branches: {
      why: "Why is soil this densely populated?",
      how: "How do scientists even count this?",
      whatIf: "What if we treated soil like a living organ?",
    },
    image: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=900",
  },
  {
    id: "c1",
    category: "AI",
    readTime: "1 min",
    title: "",
    description:
      "Both rely heavily on prediction, not storage — reconstructing a plausible answer each time, rather than pulling up a saved, exact copy.",
    isConnection: true,
    connectionTags: ["Memory", "AI"],
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900",
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class MockDiscoveryService implements DiscoveryService {
  async getDiscoveries(filter: string): Promise<Discovery[]> {
    // Small artificial latency so loading states behave the same way they
    // will once this is a real network call. Safe to delete once wired up.
    await delay(120);
    if (!filter || filter === "All") return MOCK_DISCOVERIES;
    return MOCK_DISCOVERIES.filter((d) => d.category === filter);
  }
}

/**
 * Sketch of what a real implementation would look like — uncomment and
 * adapt once there's an endpoint to hit, then flip the export below.
 *
 * class ApiDiscoveryService implements DiscoveryService {
 *   async getDiscoveries(filter: string): Promise<Discovery[]> {
 *     const res = await fetch(
 *       `https://api.euno.app/v1/discoveries?topic=${encodeURIComponent(filter)}`
 *     );
 *     if (!res.ok) throw new Error(`Failed to load discoveries (${res.status})`);
 *     return res.json();
 *   }
 * }
 */

export const discoveryService: DiscoveryService = new MockDiscoveryService();
