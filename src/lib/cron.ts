import cron from "node-cron";
import { prisma } from "@/lib/db";
import { getAggregatedEvents } from "@/lib/aggregator";

let started = false;

export function startDailyCron() {
  if (started) return; // HMR等による多重登録を防ぐ
  started = true;

  // 毎朝8時（日本時間）に全登録アーティストのイベントを一括更新
  cron.schedule(
    "0 8 * * *",
    async () => {
      const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
      console.log(`[cron] 毎朝8時の一括更新を開始 (${now})`);

      let artists: { id: string; name: string }[] = [];
      try {
        artists = await prisma.artist.findMany({
          select: { id: true, name: true },
        });
      } catch (e) {
        console.error("[cron] アーティスト取得失敗:", e);
        return;
      }

      console.log(`[cron] ${artists.length}件のアーティストを更新します`);

      for (const artist of artists) {
        try {
          // キャッシュを削除してスクレイピングを強制実行
          await prisma.event.deleteMany({ where: { artistId: artist.id } });
          await getAggregatedEvents(artist.id, artist.name);
          console.log(`[cron] ✓ ${artist.name}`);
        } catch (e) {
          console.error(`[cron] ✗ ${artist.name}:`, e);
        }
      }

      console.log("[cron] 一括更新完了");
    },
    { timezone: "Asia/Tokyo" }
  );

  console.log("[cron] 毎朝8時の自動更新スケジュール登録完了（JST）");
}
