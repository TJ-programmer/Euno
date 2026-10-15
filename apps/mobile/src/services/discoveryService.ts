export type FlowStepKey =
  | "hook"
  | "tension"
  | "reveal"
  | "why"
  | "surprise"
  | "connection"
  | "takeaway";

export type FlowStep = {
  key: FlowStepKey;
  title: string;
  body: string;
  claimIds: string[];
};

export type Discovery = {
  id: string;
  slug: string;
  title: string;
  /** Real label from the DB (flow.label), or prettified first topic. Drives the UI template. */
  label: string;
  /** Bucket used by the topic chips (Technology / Psychology / ...). */
  category: string;
  topics: string[];
  readTime: string;
  contentType: string;
  /** Ordered, de-duplicated steps: Hook → … → Takeaway. */
  steps: FlowStep[];
  /** next_curiosity body, shown on the last step as the "keep going" prompt. */
  nextCuriosity?: string;
  claimCount: number;
};

export interface DiscoveryService {
  getDiscoveries(filter: string): Promise<Discovery[]>;
}

// ─────────────────────────────────────────────────────────────────────────
// Raw API types (the API currently returns two shapes: sections directly
// on `flow`, or nested under `flow.payload`)
// ─────────────────────────────────────────────────────────────────────────

type RawSection = {
  title?: string;
  body?: string;
  source_claim_ids?: string[];
};

type RawSections = Partial<Record<FlowStepKey | "next_curiosity", RawSection>>;

type RawFlow =
  | (RawSections & {
      content_id?: string;
      label?: string;
      payload?: RawSections;
    })
  | null
  | undefined;

type FlowApiItem = {
  content_id: string;
  slug: string;
  title: string;
  content_type: string;
  difficulty: string;
  estimated_minutes: number | null;
  topics: string[] | null;
  published_at: string | null;
  flow: RawFlow;
};

type FlowApiResponse = {
  items: FlowApiItem[];
  limit: number;
  offset: number;
};

// ─────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────

// Android emulator can't reach "localhost" — use http://10.0.2.2:8000 there,
// or your LAN IP on a physical device, via EXPO_PUBLIC_API_URL.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 10000;

const STEP_ORDER: FlowStepKey[] = [
  "hook",
  "tension",
  "reveal",
  "why",
  "surprise",
  "connection",
  "takeaway",
];

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const CITATION_RE = /\s*\((?:claim-?|cl|c)\d+(?:\s*,\s*(?:claim-?|cl|c)\d+)*\)/gi;

/** Strips "(c1)" style citation markers and tidies whitespace. */
function cleanBody(text?: string): string {
  if (!text) return "";
  return text
    .replace(CITATION_RE, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function prettify(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getCategory(topics: string[]): string {
  const t = topics.map((x) => x.toLowerCase());
  const has = (list: string[]) => t.some((x) => list.includes(x));

  if (has(["psychology", "human-behavior", "cognitive-science"])) return "Psychology";
  if (has(["nature", "ecology", "environment", "animals"])) return "Nature";
  if (has(["health", "food", "nutrition", "medicine"])) return "Health";
  if (has(["science", "space", "biology", "physics", "chemistry"])) return "Science";
  if (has(["technology", "artificial-intelligence", "ai", "programming", "startups"]))
    return "Technology";

  return topics[0] ? prettify(topics[0]) : "Discovery";
}

/** Sections can live on `flow` directly or under `flow.payload` (which may be `{}`). */
function extractSections(flow: RawFlow): RawSections {
  if (!flow) return {};
  const nested = flow.payload;
  if (nested && typeof nested === "object" && nested.hook) return nested;
  return flow;
}

const normalizeForDedupe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function mapFlowItem(item: FlowApiItem): Discovery | null {
  const sections = extractSections(item.flow);
  const topics = item.topics ?? [];

  const seen = new Set<string>();
  const claimIds = new Set<string>();
  const steps: FlowStep[] = [];

  for (const key of STEP_ORDER) {
    const section = sections[key];
    const body = cleanBody(section?.body);
    if (!body) continue;

    // Some items repeat the same sentence across steps (e.g. reveal == takeaway).
    const dedupeKey = normalizeForDedupe(body);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    (section?.source_claim_ids ?? []).forEach((id) => claimIds.add(id));
    steps.push({
      key,
      title: section?.title ?? key,
      body,
      claimIds: section?.source_claim_ids ?? [],
    });
  }

  if (steps.length === 0) return null;

  const label = item.flow?.label?.trim() || prettify(topics[0] ?? "Discovery");
  const nextCuriosity = cleanBody(sections.next_curiosity?.body) || undefined;

  return {
    id: item.content_id,
    slug: item.slug,
    title: item.title,
    label,
    category: getCategory(topics),
    topics,
    readTime: `${item.estimated_minutes ?? 3} min`,
    contentType: item.content_type,
    steps,
    nextCuriosity,
    claimCount: claimIds.size,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────

class ApiDiscoveryService implements DiscoveryService {
  async getDiscoveries(filter: string): Promise<Discovery[]> {
    const url = `${API_BASE_URL}/api/v1/flow?limit=20&offset=0`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`Failed to load Flow feed (${response.status})`);
    }

    const data = (await response.json()) as FlowApiResponse;
    if (!Array.isArray(data.items)) {
      throw new Error("The Flow API returned an invalid response.");
    }

    const discoveries = data.items
      .map(mapFlowItem)
      .filter((d): d is Discovery => d !== null);

    if (!filter || filter === "All") return discoveries;

    const f = filter.toLowerCase();
    return discoveries.filter(
      (d) => d.category.toLowerCase() === f || d.topics.some((t) => t.toLowerCase() === f)
    );
  }
}

export const discoveryService: DiscoveryService = new ApiDiscoveryService();
