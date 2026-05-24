export type BandsintownEvent = {
  id: string;
  title: string;
  datetime: string;
  venue: {
    name: string;
    city: string;
    country: string;
  };
  url: string;
  offers: Array<{ url: string }>;
};

export type BandsintownArtist = {
  id: string;
  name: string;
  image_url: string;
  thumb_url: string;
};

const APP_ID = process.env.BANDSINTOWN_APP_ID ?? "event-calendar-app";
const BASE_URL = "https://rest.bandsintown.com";

export async function searchArtist(name: string): Promise<BandsintownArtist | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/artists/${encodeURIComponent(name)}?app_id=${APP_ID}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getArtistEvents(
  artistName: string,
  limit = 5
): Promise<BandsintownEvent[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/artists/${encodeURIComponent(artistName)}/events?app_id=${APP_ID}&date=upcoming`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.slice(0, limit);
  } catch {
    return [];
  }
}
