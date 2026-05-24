import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getAggregatedEvents } from "@/lib/aggregator";
import Header from "@/components/Header";
import EventCard from "@/components/EventCard";
import TicketSiteLinks from "@/components/TicketSiteLinks";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userArtists = await prisma.userArtist.findMany({
    where: { userId: session.userId },
    include: { artist: true },
    orderBy: { createdAt: "asc" },
  });

  const artistsWithEvents = await Promise.all(
    userArtists.map(async ({ artist }) => {
      const events = await getAggregatedEvents(artist.id, artist.name, 5);
      return { artist, events };
    })
  );

  return (
    <div>
      <Header email={session.email} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <TicketSiteLinks />
        {userArtists.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-4">アーティストが登録されていません</p>
            <Link
              href="/artists/new"
              className="inline-block bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              アーティストを追加する
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {artistsWithEvents.map(({ artist, events }) => (
              <section key={artist.id}>
                <div className="flex items-center justify-between mb-3">
                  <Link
                    href={`/artists/${artist.id}`}
                    className="text-lg font-semibold hover:text-gray-600 transition-colors"
                  >
                    {artist.name}
                  </Link>
                  <Link
                    href={`/artists/${artist.id}`}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    すべて見る →
                  </Link>
                </div>
                {events.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">現在予定されているイベントはありません</p>
                ) : (
                  <div className="space-y-2">
                    {events.map((ev, i) => (
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
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
