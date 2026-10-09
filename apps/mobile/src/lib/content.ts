const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ;

export type HomeFeedItem = {
  content_id: string;
  slug: string;
  label: string;
  title: string;
  summary: string;
  content_type: string;
  difficulty: string;
  estimated_minutes: number;
  topics: string[];
  published_at: string | null;
};

export type HomeFeedResponse = {
  items: HomeFeedItem[];
  limit: number;
  offset: number;
};

export async function getHomeContent(
  limit = 20,
  offset = 0,
): Promise<HomeFeedItem[]> {
  const url =
    `${API_BASE_URL}/api/v1/home` +
    `?limit=${limit}` +
    `&offset=${offset}`;

  console.log("HOME FEED REQUEST:", url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to load Home feed (${response.status})`,
    );
  }

  const data: HomeFeedResponse = await response.json();

  return data.items;
}
