import { Brain, FileText, Lightbulb, Target, Info, StickyNote, Image as ImageIcon, Mic } from "lucide-react";
import type { Memory } from "@/lib/db/types";

export const KIND_ICON: Record<Memory["kind"], typeof Brain> = { note: StickyNote, idea: Lightbulb, info: Info, goal: Target, document: FileText, image: ImageIcon, voice: Mic };

export const KIND_LABEL: Record<Memory["kind"], string> = {
  note: "Note", idea: "Idea", info: "Important info", goal: "Goal", document: "Document", image: "Image", voice: "Voice note",
};
