import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { removeArtist } from "@/actions/artists";
import Header from "@/components/Header";
import ArtistsTabs from "@/components/ArtistsTabs";

export default async function ArtistsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userArtists = await prisma.userArtist.findMany({
    where: { userId: session.userId },
    include: { artist: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <Header email={session.email} />
      <main className="max-w-3xl mx-auto px-4 pt-6 pb-8">
        <ArtistsTabs />

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            {userArtists.length} / 50件
          </span>
        </div>

        {userArtists.length === 0 ? (
          <p className="text-gray-400 text-center py-16">
            まだアーティストが登録されていません
          </p>
        ) : (
          <ul className="space-y-2">
            {userArtists.map(({ artist }) => (
              <li
                key={artist.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
              >
                <Link
                  href={`/artists/${artist.id}`}
                  className="font-medium hover:text-gray-600 transition-colors"
                >
                  {artist.name}
                </Link>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/artists/${artist.id}`}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    イベント →
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await removeArtist(artist.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-sm text-red-400 hover:text-red-600 transition-colors"
                    >
                      削除
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
