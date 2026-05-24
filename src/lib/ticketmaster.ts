const API_KEY = process.env.TICKETMASTER_API_KEY ?? "";
const BASE_URL = "https://app.ticketmaster.com/discovery/v2";

export type TicketmasterArtist = {
  id: string;
  name: string;
  images?: Array<{ url: string; width: number; height: number }>;
};

export type TicketmasterEvent = {
  id: string;
  name: string;
  dates: {
    start: { localDate: string; localTime?: string };
  };
  classifications?: Array<{
    segment?: { name: string };
    genre?: { name: string };
  }>;
  _embedded?: {
    venues?: Array<{ name: string; city?: { name: string }; country?: { name: string } }>;
  };
  url: string;
};

export async function searchArtist(name: string): Promise<TicketmasterArtist | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(
      `${BASE_URL}/attractions.json?keyword=${encodeURIComponent(name)}&apikey=${API_KEY}&size=10`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const attractions: TicketmasterArtist[] = data._embedded?.attractions ?? [];
    // 完全一致を優先して返す
    const exact = attractions.find(
      (a) => a.name.toLowerCase() === name.toLowerCase()
    );
    return exact ?? attractions[0] ?? null;
  } catch {
    return null;
  }
}

export async function getArtistEvents(
  attractionId: string,
  limit = 5
): Promise<TicketmasterEvent[]> {
  if (!API_KEY) return [];
  try {
    const res = await fetch(
      `${BASE_URL}/events.json?attractionId=${attractionId}&apikey=${API_KEY}&size=${limit}&sort=date,asc`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data._embedded?.events ?? [];
  } catch {
    return [];
  }
}
