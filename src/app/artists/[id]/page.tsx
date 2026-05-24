import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getAggregatedEvents } from "@/lib/aggregator";
import { removeArtist } from "@/actions/artists";
import Header from "@/components/Header";
import EventCard from "@/components/EventCard";

const EVENT_TYPES = [
  { value: "all", label: "すべて" },
  { value: "live", label: "ライブ" },
  { value: "concert", label: "コンサート" },
  { value: "exhibition", label: "展示会" },
  { value: "talk", label: "トークショー" },
  { value: "other", label: "その他" },
];

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
};

export default async function ArtistDetailPage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { type = "all" } = await searchParams;

  const userArtist = await prisma.userArtist.findUnique({
    where: { userId_artistId: { userId: session.userId, artistId: id } },
    include: { artist: true },
  });

  if (!userArtist) notFound();

  const { artist } = userArtist;
  const allEvents = await getAggregatedEvents(artist.id, artist.name, 20);
  const filtered = type === "all"
    ? allEvents
    : allEvents.filter((ev) => ev.eventType.includes(type));

  return (
    <div>
      <Header email={session.email} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← ホーム</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">アーティスト詳細</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            {artist.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="w-16 h-16 rounded-full object-cover mb-3"
              />
            )}
            <h1 className="text-2xl font-semibold">{artist.name}</h1>
          </div>
          <form
            action={async () => {
              "use server";
              await removeArtist(id);
              redirect("/artists");
            }}
          >
            <button
              type="submit"
              className="text-sm text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              登録解除
            </button>
          </form>
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {EVENT_TYPES.map((et) => (
            <Link
              key={et.value}
              href={`/artists/${id}?type=${et.value}`}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                type === et.value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {et.label}
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-16">
            {allEvents.length === 0
              ? "現在予定されているイベントはありません"
              : "選択した種別のイベントはありません"}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((ev, i) => (
              <EventCard
                key={`${ev.source}-${ev.date}-${i}`}
                title={ev.title}
                date={ev.date}
                venue={ev.venue}
                eventType={ev.eventType}
                url={ev.url}
                source={ev.source}
                ticketSaleStart={ev.ticketSaleStart}
                ticketSaleStatus={ev.ticketSaleStatus}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
