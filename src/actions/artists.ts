"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { previewArtistEvents } from "@/lib/aggregator";
import type { ScrapedEvent } from "@/lib/scrapers/types";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export type SearchState = {
  step: "idle" | "preview" | "error";
  query?: string;
  events?: ScrapedEvent[];
  error?: string;
};

// ステップ1：検索して候補イベントをプレビュー表示
export async function searchArtist(
  _prev: SearchState,
  formData: FormData
): Promise<SearchState> {
  await requireSession();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { step: "error", error: "アーティスト名を入力してください" };

  const events = await previewArtistEvents(name);

  return {
    step: "preview",
    query: name,
    events,
  };
}

// ステップ2：確認後に登録
export async function confirmAddArtist(
  _prev: SearchState,
  formData: FormData
): Promise<SearchState> {
  const session = await requireSession();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { step: "error", error: "アーティスト名が不正です" };

  const count = await prisma.userArtist.count({ where: { userId: session.userId } });
  if (count >= 50) return { step: "error", error: "登録できるアーティストは最大50人です" };

  // 名前をユニークキーとして使用
  const artist = await prisma.artist.upsert({
    where: { bandsintownId: name.toLowerCase() },
    update: {},
    create: {
      name,
      bandsintownId: name.toLowerCase(),
      imageUrl: null,
    },
  });

  const existing = await prisma.userArtist.findUnique({
    where: { userId_artistId: { userId: session.userId, artistId: artist.id } },
  });
  if (existing) return { step: "error", error: "このアーティストはすでに登録されています" };

  await prisma.userArtist.create({
    data: { userId: session.userId, artistId: artist.id },
  });

  redirect("/");
}

export async function removeArtist(artistId: string) {
  const session = await requireSession();
  await prisma.userArtist.deleteMany({
    where: { userId: session.userId, artistId },
  });
}
