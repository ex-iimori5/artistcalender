import Link from "next/link";
import { signOut } from "@/actions/auth";

type Props = { email: string };

export default function Header({ email }: Props) {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-gray-900">
          イベントカレンダー
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/artists/new"
            className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            + アーティスト追加
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
