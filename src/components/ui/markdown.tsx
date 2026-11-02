import * as React from "react";

/** Tiny, safe markdown renderer (bold, italics, inline code, bullet/numbered lists, paragraphs). No HTML injection. */
function inline(text: string, key: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|\[\d{1,2}\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith("**")) parts.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) parts.push(<code key={k}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) parts.push(<sup key={k} className="mx-0.5 rounded bg-mist px-1 text-[10px] font-semibold text-accent-strong">{t.slice(1, -1)}</sup>);
    else parts.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push(<p key={`p${blocks.length}`}>{inline(para.join(" "), `p${blocks.length}`)}</p>);
    para = [];
  };
  const flushList = () => {
    if (list) {
      const Tag = list.ordered ? "ol" : "ul";
      const idx = blocks.length;
      blocks.push(<Tag key={`l${idx}`}>{list.items.map((it, i) => <li key={i}>{inline(it, `l${idx}-${i}`)}</li>)}</Tag>);
    }
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const b = line.match(/^\s*[-*•]\s+(.*)$/);
    const n = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (b || n) {
      flushPara();
      const ordered = !!n;
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push((b ?? n)![1]);
    } else if (h) {
      flushPara(); flushList();
      blocks.push(<p key={`h${blocks.length}`}><strong>{h[1]}</strong></p>);
    } else if (!line.trim()) {
      flushPara(); flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara(); flushList();
  return <div className="one-prose text-[14.5px] text-ink">{blocks}</div>;
}
