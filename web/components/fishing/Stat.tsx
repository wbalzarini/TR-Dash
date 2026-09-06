/**
 * One label/value pair. Mirrors the conditions card on the main dashboard so
 * Fishing Mode reads as the same application.
 *
 * A null value renders "Unavailable" rather than a dash or a zero — the point
 * is that the reader can tell missing data from a real reading.
 */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string | null;
}) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-fathom">{label}</dt>
      <dd
        className={`readout mt-1 text-lg font-semibold ${
          value == null ? "text-fathom/70" : "text-foam"
        }`}
      >
        {value ?? "Unavailable"}
      </dd>
      {hint ? <p className="mt-0.5 text-[10px] text-fathom">{hint}</p> : null}
    </div>
  );
}
