const API_KEY = process.env.SETLIST_FM_API_KEY ?? "";
const BASE_URL = "https://api.setlist.fm/rest/1.0";

const headers = {
  "x-api-key": API_KEY,
  Accept: "application/json",
};

export type SetlistFmArtist = {
  mbid: string;
  name: string;
  url: string;
};

export type SetlistFmSetlist = {
  id: string;
  eventDate: string; // "DD-MM-YYYY"
  venue: {
    name: string;
    city: { name: string; country: { name: string } };
    url: string;
  };
  url: string;
  sets: { set: Array<{ song: Array<{ name: string }> }> };
};

export async function searchArtist(name: string): Promise<SetlistFmArtist | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(
      `${BASE_URL}/search/artists?artistName=${encodeURIComponent(name)}&p=1`,
      { headers, next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const artists: SetlistFmArtist[] = data.artist ?? [];
    return artists[0] ?? null;
  } catch {
    return null;
  }
}

export async function getArtistSetlists(
  mbid: string,
  limit = 5
): Promise<SetlistFmSetlist[]> {
  if (!API_KEY) return [];
  try {
    const res = await fetch(
      `${BASE_URL}/artist/${mbid}/setlists?p=1`,
      { headers, next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const setlists: SetlistFmSetlist[] = data.setlist ?? [];
    return setlists.slice(0, limit);
  } catch {
    return [];
  }
}

export function parseSetlistDate(dateStr: string): string {
  // "DD-MM-YYYY" → ISO string
  const [dd, mm, yyyy] = dateStr.split("-");
  return `${yyyy}-${mm}-${dd}`;
}
