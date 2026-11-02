import { LegalPage } from "./legal";
export const metadata = { title: "Terms" };
export default function Terms() {
  return (
    <LegalPage title="Terms of Service" sections={[
      ["Draft notice", "These terms are a placeholder for the product prototype and must be replaced by reviewed terms before public launch."],
      ["The service", "ONE helps you store information, organise your life and prepare actions. ONE never sends messages, signs contracts or makes bookings on your behalf without your explicit confirmation."],
      ["AI output", "AI suggestions can be incomplete or wrong. Always review drafts and important information before acting on them."],
      ["Plans & billing", "Paid plans are billed monthly and can be cancelled at any time. In the current demo billing mode no real payments are processed."],
      ["Your content", "You own your content. You can export or delete it at any time."],
    ]} />
  );
}
