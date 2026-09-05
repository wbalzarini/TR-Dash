import { ExternalLink } from "lucide-react";

const SOURCES = [
  {
    label: "Weather",
    name: "Open-Meteo",
    href: "https://open-meteo.com/",
  },
  {
    label: "River",
    name: "Canadian Hydrographic Service · Government of Canada",
    href: "https://tides.gc.ca/en",
  },
  {
    label: "Border · U.S. → Canada",
    name: "Canada Border Services Agency",
    href: "https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html",
  },
  {
    label: "Border · Canada → U.S.",
    name: "U.S. Customs and Border Protection",
    href: "https://bwt.cbp.gov/",
  },
];

export function DataSourcesFooter() {
  return (
    <footer className="mt-8 border-t border-foam/8 pt-6 pb-10">
      <p className="eyebrow mb-4">Data Sources</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SOURCES.map((source) => (
          <li key={source.label}>
            <p className="text-[11px] text-fathom">{source.label}</p>
            <a
              href={source.href}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-mist transition-colors hover:text-beacon"
            >
              {source.name}
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[11px] leading-relaxed text-fathom/70">
        Readings are published by the agencies above and are shown with the time they
        were observed, not the time this page loaded. Never navigate on this data
        alone.
      </p>
    </footer>
  );
}
