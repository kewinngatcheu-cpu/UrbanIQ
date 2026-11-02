import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { LegalPage } from "../terms/legal";
export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Privacy") };
}
export default async function Privacy() {
  const tr = await getT();
  return (
    <LegalPage title={tr("Privacy Policy")} sections={[
      ["Draft notice", "This is a product-prototype privacy summary and must be reviewed by legal counsel before launch (GDPR: controller details, legal bases, processors, retention, DPO)."],
      ["What we store", "Your account (email, name), your plan, and the content you choose to save: memories, documents, tasks, reminders, projects, actions and conversations with ONE."],
      ["Who can access it", "Only you. Data is separated per account and protected by row-level security. The operator cannot read your private content unless you grant time-limited support access, which is logged."],
      ["AI processing", "When AI features are enabled, the relevant excerpts of your own data are sent to the AI provider (Anthropic) to generate an answer. They are not used to train models according to the provider's API terms."],
      ["Your rights", "Export all your data as JSON or permanently delete your account at any time in Settings → Privacy."],
    ]} />
  );
}
