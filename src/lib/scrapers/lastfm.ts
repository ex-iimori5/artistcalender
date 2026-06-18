import * as cheerio from "cheerio";
import type { ScrapedEvent } from "./types";

const BASE_URL = "https://www.last.fm";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ja,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export async function scrapeLastFm(artistName: string): Promise<ScrapedEvent[]> {
  const url = `${BASE_URL}/music/${encodeURIComponent(artistName)}/+events`;

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    console.log(`[lastfm] ${res.status} ${url}`);
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const events: ScrapedEvent[] = [];
    const today = new Date().toISOString().split("T")[0];

    $(".events-list-item").each((_, el) => {
      // Date from itemprop or datetime attribute
      const dateStr =
        $(el).find("[itemprop='startDate']").attr("content") ??
        $(el).find("time").attr("datetime") ??
        "";
      const date = dateStr.split("T")[0]; // "2026-07-31T00:00:00" → "2026-07-31"
      if (!date || date < today) return;

      // Event title
      const title =
        $(el).find("[itemprop='name']").first().text().trim() ||
        $(el).find(".events-list-item-event-name").first().text().trim();
      if (!title) return;

      // Venue + location (clean up whitespace)
      const rawVenue = $(el)
        .find("[itemprop='location'], .events-list-item-venue, .events-list-item-event--venue")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const venue = rawVenue || "会場未定";

      // URL — prefer event link, fall back to festival link
      const href =
        $(el).find("a[itemprop='url']").attr("href") ??
        $(el).find("a.events-list-item-event-name").attr("href") ??
        $(el).find("a[href]").first().attr("href") ??
        "";
      const eventUrl = href.startsWith("http") ? href : href ? `${BASE_URL}${href}` : url;

      // Classify event type
      const titleLower = title.toLowerCase();
      const eventType =
        titleLower.includes("festival") || titleLower.includes("fest") || titleLower.includes("フェス")
          ? "live"
          : titleLower.includes("tour")
          ? "live"
          : "live";

      events.push({
        title,
        date,
        venue,
        url: eventUrl,
        source: "lastfm",
        eventType,
      });
    });

    console.log(`[lastfm] found ${events.length} events`);
    return events.slice(0, 10);
  } catch (e) {
    console.warn(`[lastfm] error: ${e}`);
    return [];
  }
}
