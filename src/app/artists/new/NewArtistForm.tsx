"use client";

import { useActionState } from "react";
import { searchArtist, confirmAddArtist, type SearchState } from "@/actions/artists";
import { SOURCE_LABELS, SOURCE_COLORS } from "@/lib/scrapers/types";

const initialState: SearchState = { step: "idle" };

export default function NewArtistForm() {
  const [searchState, searchAction, searchPending] = useActionState(searchArtist, initialState);
  const [, confirmAction, confirmPending] = useActionState(confirmAddArtist, initialState);

  const displayError = searchState.error;

  return (
    <>
      {/* ステップ1：検索フォーム */}
      <form action={searchAction} className="space-y-4 max-w-sm mb-8">
        {displayError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{displayError}</p>
        )}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            アーティスト名
          </label>
          <div className="flex gap-2">
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={searchState.query ?? ""}
              placeholder="例: YOASOBI、米津玄師、Aimer"
              required
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              type="submit"
              disabled={searchPending}
              className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {searchPending ? "検索中…" : "検索"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            ぴあ・e+・ローチケ・Last.fmで検索します
          </p>
        </div>
      </form>

      {/* ステップ2：プレビュー結果 */}
      {searchState.step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              「{searchState.query}」の検索結果
            </h2>
            {searchState.events && searchState.events.length > 0 && (
              <span className="text-sm text-gray-500">{searchState.events.length}件</span>
            )}
          </div>

          {searchState.events && searchState.events.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
              <p className="text-sm text-yellow-800 font-medium mb-1">
                イベントが見つかりませんでした
              </p>
              <p className="text-xs text-yellow-700">
                スペルや表記を変えて再度お試しください。
                それでも登録する場合は下のボタンから追加できます。
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {searchState.events?.map((ev, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-xl p-4 bg-white"
                >
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${SOURCE_COLORS[ev.source]}`}>
                      {SOURCE_LABELS[ev.source]}
                    </span>
                  </div>
                  <p className="font-medium text-sm text-gray-900">{ev.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(ev.date).toLocaleDateString("ja-JP", {
                      year: "numeric", month: "long", day: "numeric", weekday: "short",
                    })}
                    {" ・ "}{ev.venue}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 登録確認ボタン */}
          <form action={confirmAction}>
            <input type="hidden" name="name" value={searchState.query ?? ""} />
            <button
              type="submit"
              disabled={confirmPending}
              className="w-full sm:w-auto bg-gray-900 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {confirmPending ? "登録中…" : `「${searchState.query}」を登録する`}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
