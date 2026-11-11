import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

/** Render a lucide icon by name (names come from the static nav config). */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const C = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[name] ?? Icons.Circle;
  return <C {...props} />;
}
