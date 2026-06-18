import { NextRequest, NextResponse } from "next/server";
import { scrapeLawson } from "@/lib/scrapers/lawson";
import { scrapeLastFm } from "@/lib/scrapers/lastfm";
import { scrapePia } from "@/lib/scrapers/pia";
import { scrapeEplus } from "@/lib/scrapers/eplus";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist");
  if (!artist) {
    return NextResponse.json({ error: "?artist= パラメータが必要です" }, { status: 400 });
  }

  const start = Date.now();
  const [lawson, lastfm, pia, eplus] = await Promise.allSettled([
    scrapeLawson(artist),
    scrapeLastFm(artist),
    scrapePia(artist),
    scrapeEplus(artist),
  ]);

  return NextResponse.json({
    artist,
    elapsed: `${Date.now() - start}ms`,
    results: {
      lawson: lawson.status === "fulfilled" ? { count: lawson.value.length, events: lawson.value } : { error: String(lawson.reason) },
      lastfm: lastfm.status === "fulfilled" ? { count: lastfm.value.length, events: lastfm.value } : { error: String(lastfm.reason) },
      pia:    pia.status    === "fulfilled" ? { count: pia.value.length,    events: pia.value    } : { error: String(pia.reason) },
      eplus:  eplus.status  === "fulfilled" ? { count: eplus.value.length,  events: eplus.value  } : { error: String(eplus.reason) },
    },
  });
}
