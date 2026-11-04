import { CheckCircle2, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n/server";

/** Shows whether an insight is confirmed by stored data or a conclusion ONE draws. */
export async function Certainty({ value }: { value?: "fact" | "inference" }) {
  if (!value) return null;
  const tr = await getT();
  return value === "fact"
    ? <Badge tone="mint" title={tr("Directly confirmed by your stored data")}><CheckCircle2 /> {tr("Confirmed")}</Badge>
    : <Badge tone="lavender" title={tr("A conclusion ONE draws from your data — please check it")}><Lightbulb /> {tr("Conclusion")}</Badge>;
}
