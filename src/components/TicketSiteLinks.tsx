const SITES = [
  {
    name: "ぴあ",
    url: "https://t.pia.jp",
    favicon: "https://www.google.com/s2/favicons?domain=t.pia.jp&sz=32",
    bg: "bg-pink-50 hover:bg-pink-100",
    border: "border-pink-200",
    text: "text-pink-700",
  },
  {
    name: "e+",
    url: "https://eplus.jp",
    favicon: "https://www.google.com/s2/favicons?domain=eplus.jp&sz=32",
    bg: "bg-orange-50 hover:bg-orange-100",
    border: "border-orange-200",
    text: "text-orange-700",
  },
  {
    name: "ローチケ",
    url: "https://l-tike.com",
    favicon: "https://www.google.com/s2/favicons?domain=l-tike.com&sz=32",
    bg: "bg-green-50 hover:bg-green-100",
    border: "border-green-200",
    text: "text-green-700",
  },
  {
    name: "Last.fm",
    url: "https://www.last.fm",
    favicon: "https://www.google.com/s2/favicons?domain=last.fm&sz=32",
    bg: "bg-purple-50 hover:bg-purple-100",
    border: "border-purple-200",
    text: "text-purple-700",
  },
];

export default function TicketSiteLinks() {
  return (
    <div className="mb-8">
      <p className="text-xs text-gray-400 mb-2">チケットサイト</p>
      <div className="flex gap-2 flex-wrap">
        {SITES.map((site) => (
          <a
            key={site.name}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${site.bg} ${site.border} ${site.text}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={site.favicon}
              alt=""
              width={16}
              height={16}
              className="rounded-sm"
            />
            {site.name}
          </a>
        ))}
      </div>
    </div>
  );
}
