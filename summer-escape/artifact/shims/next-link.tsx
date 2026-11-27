import type { AnchorHTMLAttributes } from "react";
export default function Link({ href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string | { pathname?: string } }) {
  const h = typeof href === "string" ? href : (href as { pathname?: string }).pathname ?? "#";
  // Inside the artifact there are no other routes – only in-page anchors work.
  return <a href={h.startsWith("#") || h.startsWith("http") ? h : "#"} {...rest} />;
}
