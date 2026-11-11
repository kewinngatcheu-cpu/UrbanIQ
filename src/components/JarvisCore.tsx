export type CoreState = "idle" | "listening" | "thinking" | "executing" | "completed" | "error";

const COLORS: Record<CoreState, [string, string]> = {
  idle: ["#37CFFF", "#1677FF"],
  listening: ["#37CFFF", "#37CFFF"],
  thinking: ["#258BFF", "#1677FF"],
  executing: ["#37CFFF", "#258BFF"],
  completed: ["#22C55E", "#1677FF"],
  error: ["#EF4444", "#7f1d1d"],
};
export const CORE_LABEL: Record<CoreState, string> = {
  idle: "Bereit", listening: "Hört zu", thinking: "Denkt nach", executing: "Führt aus", completed: "Erledigt", error: "Fehler",
};

/** The central JARVIS visualization. Pure SVG + CSS; motion is reduced when the OS asks for it. */
export function JarvisCore({ state = "idle", size = 120 }: { state?: CoreState; size?: number }) {
  const [a, b] = COLORS[state];
  const busy = state === "thinking" || state === "executing";
  const id = `core-${state}`;
  const small = size < 60; // thin details vanish at small sizes – draw bolder strokes
  const w = small ? 7 : 1.5;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={`JARVIS: ${CORE_LABEL[state]}`}>
      <defs>
        <radialGradient id={id} cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor={a} stopOpacity="0.95" />
          <stop offset="0.6" stopColor={b} stopOpacity="0.55" />
          <stop offset="1" stopColor="#05070B" stopOpacity="0" />
        </radialGradient>
      </defs>
      {state === "listening" && [0, 0.5, 1].map((d) => (
        <circle key={d} cx="100" cy="100" r="46" fill="none" stroke={a} strokeWidth="1.5" className="orb-wave" style={{ animationDelay: `${d}s` }} />
      ))}
      <circle cx="100" cy="100" r="70" fill={`url(#${id})`} className="orb-pulse" />
      <g className={busy ? "orb-spin-fast" : "orb-spin"}>
        <circle cx="100" cy="100" r="84" fill="none" stroke={b} strokeOpacity={small ? 0.8 : 0.55} strokeWidth={w} strokeDasharray="34 14 6 14" />
      </g>
      <g className={busy ? "orb-spin" : ""} style={{ animationDirection: "reverse" }}>
        <circle cx="100" cy="100" r="62" fill="none" stroke={a} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 8" />
      </g>
      <circle cx="100" cy="100" r={small ? 34 : 26} fill="#05070B" stroke={a} strokeWidth={small ? 9 : 3} />
      <circle cx="100" cy="100" r={small ? 13 : 9} fill={a} className="orb-pulse" />
    </svg>
  );
}
