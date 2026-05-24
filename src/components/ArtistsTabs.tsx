"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "登録一覧", href: "/artists" },
  { label: "アーティスト追加", href: "/artists/new" },
];

export default function ArtistsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex border-b border-gray-200 mb-6">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
