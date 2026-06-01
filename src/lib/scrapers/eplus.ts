import type { ScrapedEvent } from "./types";

const BASE_URL = "https://eplus.jp";

function parseJapaneseDate(text: string): string | null {
  // "2025年6月20日(土)" → "2025-06-20"
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function parseSlashDate(text: string): string | null {
  // "2025/06/20" → "2025-06-20"
  const m = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function inferEventType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("コンサート") || t.includes("concert")) return "concert";
  if (t.includes("フェス") || t.includes("festival") || t.includes("fest")) return "live";
  if (t.includes("展示") || t.includes("exhibition") || t.includes("expo")) return "exhibition";
  if (t.includes("トーク") || t.includes("talk")) return "talk";
  return "live";
}

export async function scrapeEplus(artistName: string): Promise<ScrapedEvent[]> {
  const searchUrl = `${BASE_URL}/sf/search/?keyword=${encodeURIComponent(artistName)}&genre=001`;

  // Playwright起動前に疎通確認（IPv4環境以外ではスキップ）
  try {
    await fetch(BASE_URL, { method: "HEAD", signal: AbortSignal.timeout(3000) });
  } catch {
    console.log(`[eplus] skipped: host unreachable`);
    return [];
  }

  // Playwrightが利用不可の環境（Vercel等）ではスキップ
  let chromium: import("playwright").BrowserType;
  try {
    chromium = (await import("playwright")).chromium;
  } catch {
    console.log("[eplus] skipped: playwright not available");
    return [];
  }

  console.log(`[eplus] Searching: ${searchUrl}`);
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
    });

    // Intercept API responses that contain event data
    const capturedEvents: ScrapedEvent[] = [];
    const today = new Date().toISOString().split("T")[0];

    context.on("response", async (response) => {
      const url = response.url();
      const ct = response.headers()["content-type"] ?? "";
      // e+ loads event JSON from various internal API endpoints
      if ((ct.includes("json") || ct.includes("javascript")) && url.includes("eplus.jp")) {
        try {
          const body = await response.text();
          // Look for event-like arrays in JSON responses
          const eventMatch = body.match(/"(?:eventList|scheduleList|performList|eventItems?)"\s*:\s*(\[.*?\])/s);
          if (eventMatch) {
            const list = JSON.parse(eventMatch[1]) as Array<Record<string, string>>;
            for (const ev of list) {
              const titleField = ev["eventTitle"] ?? ev["title"] ?? ev["eventName"] ?? "";
              const dateField = ev["eventDate"] ?? ev["performDate"] ?? ev["date"] ?? "";
              const venueField = ev["venue"] ?? ev["venueName"] ?? ev["placeName"] ?? "";
              const urlField = ev["eventUrl"] ?? ev["url"] ?? ev["detailUrl"] ?? "";
              if (!titleField || !dateField) continue;
              const date =
                parseJapaneseDate(dateField) ??
                parseSlashDate(dateField) ??
                dateField.split("T")[0];
              if (!date || date < today) continue;
              capturedEvents.push({
                title: titleField,
                date,
                venue: venueField || "会場未定",
                url: urlField || searchUrl,
                source: "eplus",
                eventType: inferEventType(titleField),
              });
            }
          }
        } catch {}
      }
    });

    const page = await context.newPage();
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for results container or "no results" message
    await Promise.race([
      page.waitForSelector(
        "#sys-s2-result li, .block-list-search-event-unit li, .list-event li, [class*='searchResult'] li",
        { timeout: 8000 }
      ).catch(() => null),
      page.waitForSelector(
        ":text('該当するイベントはありません'), :text('見つかりません'), :text('検索結果がありません')",
        { timeout: 8000 }
      ).catch(() => null),
    ]);

    // Return API-intercepted events if found
    if (capturedEvents.length > 0) {
      console.log(`[eplus] captured ${capturedEvents.length} events from API response`);
      return capturedEvents.slice(0, 10);
    }

    // Fallback: parse rendered DOM
    const events = await page.evaluate(
      ({ today, searchUrl }: { today: string; searchUrl: string }) => {
        const results: Array<{ title: string; date: string; venue: string; url: string }> = [];

        // Try multiple selectors for e+ event items
        const items = document.querySelectorAll(
          [
            "#sys-s2-result li",
            ".block-list-search-event-unit li",
            ".list-search-event-unit__item",
            ".unit-event-detail",
            ".event-list-item",
            "article.event",
            "li.event-item",
          ].join(", ")
        );

        items.forEach((item) => {
          const titleEl =
            item.querySelector("h3, h2, .title, .event-title, [class*='title'], [class*='name']");
          const linkEl = item.querySelector("a[href]");
          const dateEl = item.querySelector(
            "time, .date, [class*='date'], [datetime], .schedule"
          );
          const venueEl = item.querySelector(
            ".venue, .place, .hall, [class*='venue'], [class*='place']"
          );

          const title = titleEl?.textContent?.trim() ?? "";
          const href = linkEl instanceof HTMLAnchorElement ? linkEl.href : "";
          const dateText =
            dateEl instanceof HTMLTimeElement
              ? (dateEl.getAttribute("datetime") ?? dateEl.textContent ?? "")
              : (dateEl?.textContent ?? "");
          const venue = venueEl?.textContent?.trim() ?? "会場未定";

          if (title && href) {
            results.push({ title, date: dateText.trim(), venue, url: href });
          }
        });

        // Also try the json_output hidden data container
        const jsonOut = document.querySelector("#sys-s2-result .json_output, .json_output");
        if (jsonOut) {
          try {
            type EventItem = {
              eventTitle?: string;
              title?: string;
              eventDate?: string;
              date?: string;
              venueName?: string;
              venue?: string;
              eventUrl?: string;
              url?: string;
            };
            const data = JSON.parse(jsonOut.textContent ?? "{}") as {
              eventList?: EventItem[];
              items?: EventItem[];
            };
            const list: EventItem[] = data.eventList ?? data.items ?? [];
            for (const ev of list) {
              const title = ev.eventTitle ?? ev.title ?? "";
              const date = ev.eventDate ?? ev.date ?? "";
              const venue = ev.venueName ?? ev.venue ?? "会場未定";
              const url = ev.eventUrl ?? ev.url ?? searchUrl;
              if (title) results.push({ title, date, venue, url });
            }
          } catch {}
        }

        return results;
      },
      { today, searchUrl }
    );

    const today2 = new Date().toISOString().split("T")[0];
    const parsed: ScrapedEvent[] = events.flatMap((ev) => {
      const date =
        parseJapaneseDate(ev.date) ??
        parseSlashDate(ev.date) ??
        (ev.date.includes("T") ? ev.date.split("T")[0] : ev.date);
      if (date < today2) return [];
      return [{
        title: ev.title,
        date,
        venue: ev.venue || "会場未定",
        url: ev.url || searchUrl,
        source: "eplus" as const,
        eventType: inferEventType(ev.title),
      } satisfies ScrapedEvent];
    });

    console.log(`[eplus] found ${parsed.length} events via DOM`);
    return parsed.slice(0, 10);
  } catch (e) {
    console.warn(`[eplus] error: ${e}`);
    return [];
  } finally {
    await browser?.close();
  }
}
