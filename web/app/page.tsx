import { Dashboard } from "@/components/Dashboard";
import { getDashboard } from "@/lib/dashboard";

/**
 * Rendered on every request so the phone gets a complete dashboard on first
 * paint rather than a spinner. Upstream calls are cached in-process, so this is
 * cheap — see lib/cache.ts.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const initial = await getDashboard();
  return <Dashboard initial={initial} />;
}
