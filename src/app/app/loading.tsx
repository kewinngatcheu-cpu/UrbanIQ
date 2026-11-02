import { getT } from "@/lib/i18n/server";
import { Skeleton } from "@/components/ui/misc";

export default async function Loading() {
  const tr = await getT();
  return (
    <div className="space-y-6" aria-busy="true" aria-label={tr("Loading")}>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
