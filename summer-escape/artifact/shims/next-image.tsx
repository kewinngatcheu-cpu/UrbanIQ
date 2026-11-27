/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
type Props = { src: string; alt: string; fill?: boolean; className?: string; style?: CSSProperties; priority?: boolean; sizes?: string; width?: number; height?: number };
export default function Image({ src, alt, fill, className, style }: Props) {
  return <img src={src} alt={alt} className={className} decoding="async" style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style} />;
}
