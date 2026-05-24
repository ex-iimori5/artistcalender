import { SOURCE_LABELS, SOURCE_COLORS } from "@/lib/scrapers/types";
import type { EventSource } from "@/lib/scrapers/types";

type Props = {
  title: string;
  date: string;
  venue: string;
  eventType: string;
  url?: string | null;
  source?: EventSource;
  ticketSaleStart?: string | null;
  ticketSaleStatus?: string | null;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  live: "ライブ",
  concert: "コンサート",
  exhibition: "展示会",
  talk: "トークショー",
  other: "その他",
  rock: "ロック",
  pop: "ポップ",
  "hip-hop": "ヒップホップ",
  jazz: "ジャズ",
  classical: "クラシック",
  electronic: "エレクトロニック",
  undefined: "ライブ",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function TicketSaleInfo({
  saleStart,
  saleStatus,
}: {
  saleStart?: string | null;
  saleStatus?: string | null;
}) {
  if (!saleStart && !saleStatus) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const saleDate = saleStart ? new Date(saleStart) : null;
  const isOnSale = saleDate ? saleDate <= today : true;

  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-xs">
      <span className="text-gray-400">🎫</span>
      {isOnSale ? (
        <span className="text-emerald-600 font-medium">発売中</span>
      ) : (
        <span className="text-amber-600 font-medium">
          発売予定: {formatDate(saleStart!)}
        </span>
      )}
      {saleStatus && (
        <span className="text-gray-400">（{saleStatus}）</span>
      )}
    </div>
  );
}

export default function EventCard({
  title,
  date,
  venue,
  eventType,
  url,
  source,
  ticketSaleStart,
  ticketSaleStatus,
}: Props) {
  const key = (eventType ?? "live").toLowerCase();
  const label = EVENT_TYPE_LABELS[key] ?? "ライブ";

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="inline-block text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
              {label}
            </span>
            {source && (
              <span className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 ${SOURCE_COLORS[source]}`}>
                {SOURCE_LABELS[source]}
              </span>
            )}
          </div>
          <p className="font-medium text-gray-900 truncate">{title}</p>
          <p className="text-sm text-gray-500 mt-1">{formatDate(date)}</p>
          <p className="text-sm text-gray-500">{venue}</p>
          <TicketSaleInfo saleStart={ticketSaleStart} saleStatus={ticketSaleStatus} />
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            詳細 →
          </a>
        )}
      </div>
    </div>
  );
}
