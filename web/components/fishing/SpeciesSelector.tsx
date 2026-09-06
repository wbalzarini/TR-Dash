"use client";

import { ChevronDown } from "lucide-react";
import { SPECIES } from "@/lib/fishing/species";

/**
 * Target species. A native <select> on purpose — it gets the platform picker on
 * a phone, which beats a custom menu when you're choosing with wet hands.
 */
export function SpeciesSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="text-[11px] tracking-wide text-fathom">Target species</span>
      <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-foam/12 bg-abyss/50 px-3.5 py-2.5">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none bg-transparent text-sm font-medium text-foam focus:outline-none"
        >
          {SPECIES.map((species) => (
            <option key={species.id} value={species.id} className="bg-abyss text-foam">
              {species.name}
            </option>
          ))}
        </select>
        <ChevronDown className="size-4 shrink-0 text-fathom" aria-hidden />
      </span>
    </label>
  );
}
