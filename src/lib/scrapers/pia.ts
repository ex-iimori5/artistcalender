import type { ScrapedEvent } from "./types";

const BASE_URL = "https://t.pia.jp";

function parseJapaneseDate(text: string): string | null {
  // "2025年6月20日(土)" → "2025-06-20"
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

// Infer event type from title
function inferEventType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("コンサート") || t.includes("concert")) return "concert";
  if (t.includes("フェス") || t.includes("festival") || t.includes("fest")) return "live";
  if (t.includes("展示") || t.includes("exhibition") || t.includes("expo")) return "exhibition";
  if (t.includes("トーク") || t.includes("talk")) return "talk";
  return "live";
}

export async function scrapePia(artistName: string): Promise<ScrapedEvent[]> {
  const searchUrl = `${BASE_URL}/pia/search_all.do?kw=${encodeURIComponent(artistName)}`;

  // Playwright起動前に疎通確認（IPv4環境以外ではスキップ）
  try {
    await fetch(BASE_URL, { method: "HEAD", signal: AbortSignal.timeout(3000) });
  } catch {
    console.log(`[pia] skipped: host unreachable`);
    return [];
  }

  // Playwrightが利用不可の環境（Vercel等）ではスキップ
  let chromium: import("playwright").BrowserType;
  try {
    chromium = (await import("playwright")).chromium;
  } catch {
    console.log("[pia] skipped: playwright not available");
    return [];
  }

  console.log(`[pia] Searching: ${searchUrl}`);
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

    // Intercept rlsInfo AJAX responses to capture JSON event data
    const capturedEvents: ScrapedEvent[] = [];
    const today = new Date().toISOString().split("T")[0];

    context.on("response", async (response) => {
      const url = response.url();
      if (url.includes("rlsInfo.do") || url.includes("search_all")) {
        const ct = response.headers()["content-type"] ?? "";
        if (ct.includes("json") || ct.includes("javascript")) {
          try {
            const body = await response.text();
            // Try to find JSON event data
            const match = body.match(/"eventList"\s*:\s*(\[.*?\])/s);
            if (match) {
              const eventList = JSON.parse(match[1]) as Array<{
                eventTitle?: string;
                eventUrl?: string;
                eventDate?: string;
                venue?: string;
                placeName?: string;
              }>;
              for (const ev of eventList) {
                const date = ev.eventDate
                  ? parseJapaneseDate(ev.eventDate) ?? ev.eventDate.split("T")[0]
                  : null;
                if (!date || date < today || !ev.eventTitle) continue;
                capturedEvents.push({
                  title: ev.eventTitle,
                  date,
                  venue: ev.venue ?? ev.placeName ?? "会場未定",
                  url: ev.eventUrl ?? searchUrl,
                  source: "pia",
                  eventType: inferEventType(ev.eventTitle),
                });
              }
            }
          } catch {}
        }
      }
    });

    const page = await context.newPage();
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for either event items or "no results" text
    await Promise.race([
      page.waitForSelector(".event_list_data li, [class*='searchResult'] li", { timeout: 8000 }).catch(() => null),
      page.waitForSelector(":text('に一致するチケットは見つかりませんでした')", { timeout: 8000 }).catch(() => null),
    ]);

    // If we captured JSON events via interception, return them
    if (capturedEvents.length > 0) {
      console.log(`[pia] captured ${capturedEvents.length} events from API response`);
      return capturedEvents.slice(0, 10);
    }

    // Fallback: try to parse rendered DOM event items
    const events = await page.evaluate((today: string) => {
      const results: Array<{ title: string; date: string; venue: string; url: string }> = [];
      const items = document.querySelectorAll(
        ".event_list_data li, .searchResultList li, .eventList li, article[class*='event']"
      );

      items.forEach((item) => {
        const titleEl =
          item.querySelector("figcaption") ??
          item.querySelector("h3, h2, .title, .eventTitle, .event-name");
        const linkEl = item.querySelector("a[href]");
        const dateEl = item.querySelector(
          "time, .date, .eventDate, [class*='date'], [datetime]"
        );
        const venueEl = item.querySelector(".venue, .place, .hall, [class*='venue'], [class*='place']");

        const title = titleEl?.textContent?.trim() ?? "";
        const href = linkEl instanceof HTMLAnchorElement ? linkEl.href : "";
        const dateAttr =
          dateEl instanceof HTMLTimeElement
            ? dateEl.getAttribute("datetime") ?? dateEl.textContent ?? ""
            : dateEl?.textContent ?? "";
        const venue = venueEl?.textContent?.trim() ?? "会場未定";

        if (title && href) {
          results.push({ title, date: dateAttr.trim(), venue, url: href });
        }
      });
      return results;
    }, today);

    const today2 = new Date().toISOString().split("T")[0];
    const parsed: ScrapedEvent[] = events
      .flatMap((ev) => {
        const date = parseJapaneseDate(ev.date) ?? ev.date.split("T")[0];
        if (date < today2) return [];
        return [{
          title: ev.title,
          date,
          venue: ev.venue,
          url: ev.url || searchUrl,
          source: "pia" as const,
          eventType: inferEventType(ev.title),
        } satisfies ScrapedEvent];
      });

    console.log(`[pia] found ${parsed.length} events via DOM`);
    return parsed.slice(0, 10);
  } catch (e) {
    console.warn(`[pia] error: ${e}`);
    return [];
  } finally {
    await browser?.close();
  }
}
