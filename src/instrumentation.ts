export async function register() {
  // Node.js ランタイムのみで実行（Edge Runtimeでは動かない）
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDailyCron } = await import("@/lib/cron");
    startDailyCron();
  }
}
