import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Header from "@/components/Header";
import ArtistsTabs from "@/components/ArtistsTabs";
import NewArtistForm from "./NewArtistForm";

export default async function NewArtistPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div>
      <Header email={session.email} />
      <main className="max-w-3xl mx-auto px-4 pt-6 pb-8">
        <ArtistsTabs />
        <NewArtistForm />
      </main>
    </div>
  );
}
