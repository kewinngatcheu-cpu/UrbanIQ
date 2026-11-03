// Renders the lucide icons used in ONE's UI to static SVG strings for the film (lucide: ISC license).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as L from "lucide-react";
import { writeFileSync } from "node:fs";
const names = ["FileText","Brain","Zap","CalendarDays","Sparkles","Bell","Mail","Receipt","StickyNote","Check","Search","Upload","Lightbulb","Info","House","ListChecks","Link","ShieldCheck","Flag","MessageCircle","Target","CircleCheck","ArrowUp","Scissors","CreditCard","Paperclip","SquareCheck","Calendar","Plane","Clock","ArrowRight","Image","Mic","Pin"];
const out = {};
for (const n of names) out[n] = renderToStaticMarkup(createElement(L[n], { size: 24, strokeWidth: 2 })).replace(/ class="[^"]*"/, "");
writeFileSync(new URL("../film/icons.js", import.meta.url), "window.ICONS = " + JSON.stringify(out, null, 0) + ";\n");
console.log(Object.keys(out).length, "icons");
