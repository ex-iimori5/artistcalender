import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "アーティストイベントカレンダー",
  description: "好きなアーティストのイベント情報をまとめて確認",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
