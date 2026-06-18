import { NextRequest, NextResponse } from "next/server";
import { scrapeLawson } from "@/lib/scrapers/lawson";
import { scrapeLastFm } from "@/lib/scrapers/lastfm";
import { scrapePia } from "@/lib/scrapers/pia";
import { scrapeEplus } from "@/lib/scrapers/eplus";

export const runtime = "nodejs";
export const maxDuration = 60;

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number } | { error: string; ms: number }> {
  const start = Date.now();
  try {
    const result = await fn();
    return { result, ms: Date.now() - start };
  } catch (e) {
    return { error: String(e), ms: Date.now() - start };
  }
}

// 疎通テスト
async function testReach(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    return `${res.status} ${res.statusText}`;
  } catch (e) {
    return `ERROR: ${e}`;
  }
}

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist");
  if (!artist) {
    return NextResponse.json({ error: "?artist= パラメータが必要です" }, { status: 400 });
  }

  const start = Date.now();

  // 疎通テストと実際のスクレイピングを並行実行
  const [reachLawson, reachLastfm, reachPia, lawsonResult, lastfmResult, piaResult, eplusResult] =
    await Promise.all([
      testReach("https://l-tike.com"),
      testReach("https://www.last.fm"),
      testReach("https://t.pia.jp"),
      timed(() => scrapeLawson(artist)),
      timed(() => scrapeLastFm(artist)),
      timed(() => scrapePia(artist)),
      timed(() => scrapeEplus(artist)),
    ]);

  return NextResponse.json({
    artist,
    elapsed: `${Date.now() - start}ms`,
    connectivity: { lawson: reachLawson, lastfm: reachLastfm, pia: reachPia },
    results: { lawson: lawsonResult, lastfm: lastfmResult, pia: piaResult, eplus: eplusResult },
  });
}
