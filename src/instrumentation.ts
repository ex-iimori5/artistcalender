export async function register() {
  // Node.js ランタイムかつ Vercel 以外（サーバーレスではcronが動かない）
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { startDailyCron } = await import("@/lib/cron");
    startDailyCron();
  }
}
