import Link from "next/link";
import { TridentMark } from "@/components/ui/TridentMark";

export default function NotFound() {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <TridentMark className="h-12 text-beacon" />
      <h1 className="mt-5 text-2xl font-semibold tracking-[0.16em] uppercase">
        Off the chart
      </h1>
      <p className="mt-3 text-sm text-mist">That page isn&rsquo;t part of the dashboard.</p>
      <Link
        href="/"
        className="mt-6 rounded-full border border-foam/15 bg-foam/8 px-5 py-2.5 text-sm font-medium text-foam transition-colors hover:bg-foam/12"
      >
        Back to Trident Island
      </Link>
    </main>
  );
}
