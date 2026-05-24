import * as cheerio from "cheerio";
import type { ScrapedEvent } from "./types";

const BASE_URL = "https://l-tike.com";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ja,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

/**
 * Parse "MM.DD" date string (ローチケ format) into "YYYY-MM-DD".
 * Picks the nearest upcoming year based on today's date.
 */
function parseMonthDayDate(mmdd: string): string | null {
  const m = mmdd.match(/(\d{1,2})\.(\d{2})/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  const now = new Date();
  let year = now.getFullYear();
  // If this month/day has already passed this year, bump to next year
  const candidate = new Date(year, month - 1, day);
  if (candidate < now) year++;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function inferEventType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("コンサート") || t.includes("concert")) return "concert";
  if (t.includes("フェス") || t.includes("festival") || t.includes("fest")) return "live";
  if (t.includes("展示") || t.includes("exhibition") || t.includes("expo")) return "exhibition";
  if (t.includes("トーク") || t.includes("talk")) return "talk";
  return "live";
}

export async function scrapeLawson(artistName: string): Promise<ScrapedEvent[]> {
  const searchUrl = `${BASE_URL}/search/?keyword=${encodeURIComponent(artistName)}&genre_cd=001`;

  // 疎通確認（IPv4環境以外ではスキップ）
  try {
    await fetch(BASE_URL, { method: "HEAD", signal: AbortSignal.timeout(3000) });
  } catch {
    console.log(`[lawson] skipped: host unreachable`);
    return [];
  }

  try {
    // Step 1: Search for artist to get their artist page URL
    const searchRes = await fetch(searchUrl, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    console.log(`[lawson] search ${searchRes.status} ${searchUrl}`);
    if (!searchRes.ok) return [];

    const searchHtml = await searchRes.text();
    const $s = cheerio.load(searchHtml);

    // Find the first matching artist link from search results
    const artistHref = $s(".List__item .ResultBlock__link").first().attr("href");
    if (!artistHref) {
      console.log("[lawson] no artist found in search results");
      return [];
    }
    const artistUrl = artistHref.startsWith("http") ? artistHref : `${BASE_URL}${artistHref}`;
    console.log(`[lawson] artist page: ${artistUrl}`);

    // Step 2: Fetch artist page and parse events
    const artistRes = await fetch(artistUrl, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    console.log(`[lawson] artist page ${artistRes.status}`);
    if (!artistRes.ok) return [];

    const artistHtml = await artistRes.text();
    const $a = cheerio.load(artistHtml);
    const today = new Date().toISOString().split("T")[0];
    const events: ScrapedEvent[] = [];

    // Each .aData_Lcode block is one event/tour with its performance dates
    $a(".aData_Lcode").each((_, block) => {
      const blockEl = $a(block);
      const eventTitle = blockEl.find(".artist_LcodeTitle").first().text().trim() || artistName;

      blockEl.find(".artist_LcodeList").each((_, item) => {
        const itemEl = $a(item);
        const link = itemEl.find("a.link_withArrow").first();
        const href = link.attr("href") ?? "";
        const eventUrl = href.startsWith("http") ? href : href ? `${BASE_URL}${href}` : artistUrl;

        // Date: "MM.DD" — take only the first span (first date of the run)
        const dateSpanText = itemEl.find(".artist_Lcode_date span").first().text().trim();
        const date = parseMonthDayDate(dateSpanText);
        if (!date || date < today) return;

        // Venue: "都道府県 会場名"
        const pref = itemEl.find(".artist_Lcode_venue .pref").text().trim();
        const venueName = itemEl.find(".artist_Lcode_venue .venue").text().trim();
        const venue = [pref, venueName].filter(Boolean).join(" ") || "会場未定";

        // Ticket sale start date: extracted from gPfKey URL param (YYYYMMDD format)
        let ticketSaleStart: string | undefined;
        const qs = href.includes("?") ? new URLSearchParams(href.split("?")[1]) : null;
        const gPfKey = qs?.get("gPfKey") ?? "";
        const firstKey = gPfKey.split(",")[0]; // multiple keys separated by comma
        if (firstKey.length >= 8) {
          const y = firstKey.slice(0, 4);
          const mo = firstKey.slice(4, 6);
          const d = firstKey.slice(6, 8);
          const saleDate = `${y}-${mo}-${d}`;
          // Only include if it's a real date
          if (!isNaN(new Date(saleDate).getTime())) {
            ticketSaleStart = saleDate;
          }
        }

        // Ticket sale status: "一般発売", "プレリク", "FC先行" etc.
        const statusSpans = itemEl.find(".artist_Lcode_icon span")
          .map((_, el) => $a(el).text().trim())
          .get()
          .filter(Boolean);
        const ticketSaleStatus = statusSpans.join(" / ") || undefined;

        events.push({
          title: eventTitle,
          date,
          venue,
          url: eventUrl,
          source: "lawson",
          eventType: inferEventType(eventTitle),
          ticketSaleStart,
          ticketSaleStatus,
        });
      });
    });

    console.log(`[lawson] found ${events.length} events`);
    return events.slice(0, 10);
  } catch (e) {
    console.warn(`[lawson] error: ${e}`);
    return [];
  }
}
