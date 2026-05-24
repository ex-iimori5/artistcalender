import { prisma } from "@/lib/db";
import { scrapePia } from "@/lib/scrapers/pia";
import { scrapeEplus } from "@/lib/scrapers/eplus";
import { scrapeLawson } from "@/lib/scrapers/lawson";
import { scrapeLastFm } from "@/lib/scrapers/lastfm";
import type { ScrapedEvent } from "@/lib/scrapers/types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1時間

function deduplicateEvents(events: ScrapedEvent[]): ScrapedEvent[] {
  const seen = new Set<string>();
  return events.filter((ev) => {
    const key = `${ev.date}::${ev.title.toLowerCase().replace(/\s+/g, "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByDate(events: ScrapedEvent[]): ScrapedEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAggregatedEvents(
  artistId: string,   // Artist.id（内部cuid）
  artistName: string, // スクレイピング用のアーティスト名
  limit = 5
): Promise<ScrapedEvent[]> {
  // 1. DBキャッシュを確認
  const cached = await prisma.event.findMany({
    where: {
      artistId,
      cachedAt: { gte: new Date(Date.now() - CACHE_TTL_MS) },
      date: { gte: new Date() },
    },
    orderBy: { date: "asc" },
    take: limit,
  });

  if (cached.length > 0) {
    return cached.map((ev) => ({
      title: ev.title,
      date: ev.date.toISOString().split("T")[0],
      venue: ev.venue,
      url: ev.url ?? "",
      source: ev.source as ScrapedEvent["source"],
      eventType: ev.eventType,
      ticketSaleStart: ev.ticketSaleStart?.toISOString().split("T")[0],
      ticketSaleStatus: ev.ticketSaleStatus ?? undefined,
    }));
  }

  // 2. 全ソースから並列スクレイピング
  const [piaResults, eplusResults, lawsonResults, lastfmResults] = await Promise.allSettled([
    scrapePia(artistName),
    scrapeEplus(artistName),
    scrapeLawson(artistName),
    scrapeLastFm(artistName),
  ]);

  const allEvents: ScrapedEvent[] = [
    ...(piaResults.status === "fulfilled" ? piaResults.value : []),
    ...(eplusResults.status === "fulfilled" ? eplusResults.value : []),
    ...(lawsonResults.status === "fulfilled" ? lawsonResults.value : []),
    ...(lastfmResults.status === "fulfilled" ? lastfmResults.value : []),
  ];

  const deduplicated = sortByDate(deduplicateEvents(allEvents));

  // 3. DBにキャッシュ保存
  if (deduplicated.length > 0) {
    await prisma.event.deleteMany({ where: { artistId } });
    await prisma.event.createMany({
      data: deduplicated.map((ev) => ({
        artistId,
        title: ev.title,
        date: new Date(ev.date),
        venue: ev.venue,
        url: ev.url || null,
        source: ev.source,
        eventType: ev.eventType,
        cachedAt: new Date(),
        ticketSaleStart: ev.ticketSaleStart ? new Date(ev.ticketSaleStart) : null,
        ticketSaleStatus: ev.ticketSaleStatus ?? null,
      })),
    });
  }

  return deduplicated.slice(0, limit);
}

// アーティスト追加前の検索プレビュー（キャッシュなし）
export async function previewArtistEvents(artistName: string): Promise<ScrapedEvent[]> {
  const [piaResults, eplusResults, lawsonResults, lastfmResults] = await Promise.allSettled([
    scrapePia(artistName),
    scrapeEplus(artistName),
    scrapeLawson(artistName),
    scrapeLastFm(artistName),
  ]);

  const allEvents: ScrapedEvent[] = [
    ...(piaResults.status === "fulfilled" ? piaResults.value : []),
    ...(eplusResults.status === "fulfilled" ? eplusResults.value : []),
    ...(lawsonResults.status === "fulfilled" ? lawsonResults.value : []),
    ...(lastfmResults.status === "fulfilled" ? lastfmResults.value : []),
  ];

  return sortByDate(deduplicateEvents(allEvents)).slice(0, 10);
}
