import type { Lang } from "@/lib/i18n";

/**
 * Flaggen als SVG statt als Emoji: Emoji-Flaggen werden auf Windows nur als
 * Buchstabenkürzel dargestellt, das SVG sieht überall gleich aus.
 * Alle im Verhältnis 3:2 gezeichnet, damit die Kacheln gleich gross wirken.
 */
const shared = {
  viewBox: "0 0 24 16",
  width: "100%",
  height: "100%",
  preserveAspectRatio: "xMidYMid slice",
} as const;

function Germany() {
  return (
    <svg {...shared} role="presentation">
      <rect width="24" height="16" fill="#FFCE00" />
      <rect width="24" height="10.67" fill="#DD0000" />
      <rect width="24" height="5.33" fill="#000" />
    </svg>
  );
}

function UnitedKingdom() {
  return (
    <svg {...shared} role="presentation">
      <rect width="24" height="16" fill="#012169" />
      <g strokeLinecap="butt">
        <path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3.2" />
        <path d="M0 0 24 16M24 0 0 16" stroke="#C8102E" strokeWidth="1.8" />
        <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5.3" />
        <path d="M12 0v16M0 8h24" stroke="#C8102E" strokeWidth="3.2" />
      </g>
    </svg>
  );
}

function Hungary() {
  return (
    <svg {...shared} role="presentation">
      <rect width="24" height="16" fill="#477050" />
      <rect width="24" height="10.67" fill="#fff" />
      <rect width="24" height="5.33" fill="#CE2939" />
    </svg>
  );
}

function Poland() {
  return (
    <svg {...shared} role="presentation">
      <rect width="24" height="16" fill="#DC143C" />
      <rect width="24" height="8" fill="#fff" />
    </svg>
  );
}

function Portugal() {
  return (
    <svg {...shared} role="presentation">
      <rect width="24" height="16" fill="#DA291C" />
      <rect width="9.6" height="16" fill="#046A38" />
      <circle cx="9.6" cy="8" r="3.5" fill="#FFE900" />
      <circle cx="9.6" cy="8" r="2.3" fill="#046A38" />
      <circle cx="9.6" cy="8" r="1.2" fill="#fff" />
    </svg>
  );
}

const FLAGS: Record<Lang, () => React.JSX.Element> = {
  de: Germany,
  en: UnitedKingdom,
  hu: Hungary,
  pl: Poland,
  pt: Portugal,
};

export function Flag({ lang }: { lang: Lang }) {
  const Component = FLAGS[lang];
  return <Component />;
}
