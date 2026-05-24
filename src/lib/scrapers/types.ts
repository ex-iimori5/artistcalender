export type EventSource = "ticketmaster" | "pia" | "eplus" | "lawson" | "lastfm";

export type ScrapedEvent = {
  title: string;
  date: string; // ISO 8601 (YYYY-MM-DD)
  venue: string;
  url: string;
  source: EventSource;
  eventType: string;
  /** チケット発売開始日 (YYYY-MM-DD) */
  ticketSaleStart?: string;
  /** 発売区分: "一般発売", "プレリク", "FC先行" 等 */
  ticketSaleStatus?: string;
};

export const SOURCE_LABELS: Record<EventSource, string> = {
  ticketmaster: "Ticketmaster",
  pia: "ぴあ",
  eplus: "e+",
  lawson: "ローチケ",
  lastfm: "Last.fm",
};

export const SOURCE_COLORS: Record<EventSource, string> = {
  ticketmaster: "bg-blue-100 text-blue-700",
  pia: "bg-pink-100 text-pink-700",
  eplus: "bg-orange-100 text-orange-700",
  lawson: "bg-green-100 text-green-700",
  lastfm: "bg-purple-100 text-purple-700",
};
