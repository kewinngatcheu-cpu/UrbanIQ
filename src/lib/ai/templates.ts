import type { ActionType } from "@/lib/db/types";

export const ACTION_TYPES: { type: ActionType; label: string; description: string; emoji: string }[] = [
  { type: "cancellation", label: "Cancel a contract", description: "Gym, phone, subscription, insurance…", emoji: "✂️" },
  { type: "complaint", label: "File a complaint", description: "Defective product, bad service, refund", emoji: "📣" },
  { type: "understand_invoice", label: "Understand an invoice", description: "What is charged, is it correct, what to do", emoji: "🧾" },
  { type: "move", label: "Organise a move", description: "Address changes, utilities, checklist", emoji: "📦" },
  { type: "email", label: "Write an email", description: "Clear, polite and to the point", emoji: "✉️" },
  { type: "appointment", label: "Prepare an appointment", description: "Doctor, authority, bank, meeting", emoji: "📅" },
  { type: "summarize", label: "Summarise a document", description: "Key points and what it means for you", emoji: "📄" },
  { type: "custom", label: "Something else", description: "Describe what you need", emoji: "✨" },
];

export function actionLabel(type: ActionType) {
  return ACTION_TYPES.find((a) => a.type === type)?.label ?? "Action";
}

interface Template {
  steps: string[];
  draft: (title: string, details: string) => string | null;
  missing: (details: string) => string[];
}

const needs = (details: string, checks: [RegExp, string][]) => checks.filter(([re]) => !re.test(details)).map(([, label]) => label);

export const TEMPLATES: Record<ActionType, Template> = {
  cancellation: {
    steps: [
      "Find the contract or customer number",
      "Check the notice period and the earliest possible end date",
      "Review and personalise the cancellation letter below",
      "Send it in a verifiable way (email with confirmation, registered letter or the provider's portal)",
      "Save the cancellation confirmation in Memory",
    ],
    draft: (title, d) =>
      `Subject: Cancellation of my contract\n\nDear Sir or Madam,\n\nI hereby cancel my contract${/\d{4,}/.test(d) ? ` (customer/contract no. ${d.match(/\d{4,}/)![0]})` : " (customer/contract no. [NUMBER])"} at the earliest possible date.\n\nPlease send me a written confirmation of the cancellation including the exact end date.\n\nI also withdraw any consent to contact me for advertising purposes.\n\nKind regards,\n[YOUR NAME]\n[YOUR ADDRESS]\n\n— Context: ${title}`,
    missing: (d) => needs(d, [[/\d{4,}/, "Customer or contract number"], [/(gmbh|ag|inc|ltd|provider|anbieter|[A-Z][a-z]+)/, "Provider name"]]),
  },
  complaint: {
    steps: [
      "Collect the order number, date and a short description of the problem",
      "Take photos or screenshots as evidence",
      "Decide what you want: repair, replacement or refund",
      "Review the complaint letter below and send it",
      "Set a reminder to follow up in 14 days",
    ],
    draft: (title, d) =>
      `Subject: Complaint — ${title}\n\nDear Sir or Madam,\n\nI am writing to complain about the following: ${d || "[DESCRIBE THE PROBLEM]"}.\n\nOrder/reference number: [NUMBER]\nDate of purchase: [DATE]\n\nI kindly ask you to [repair / replace / refund] this within 14 days.\n\nKind regards,\n[YOUR NAME]`,
    missing: (d) => needs(d, [[/\d{3,}/, "Order or reference number"], [/(refund|replace|repair|erstatt|ersatz|reparatur)/i, "What outcome you want"]]),
  },
  understand_invoice: {
    steps: [
      "Upload or paste the invoice into Memory",
      "Check sender, invoice number, amount and due date",
      "Compare the items with what you ordered or agreed",
      "Pay before the due date — or dispute unclear items in writing",
      "Store the payment confirmation",
    ],
    draft: () => null,
    missing: (d) => needs(d, [[/(€|eur|\$|\d+[.,]\d{2})/i, "Invoice amount"], [/\d{1,2}[./-]\d{1,2}/, "Due date"]]),
  },
  move: {
    steps: [
      "Fix the moving date and book help or a moving company",
      "Give notice on the current flat (check the notice period)",
      "Register the new address with the authorities",
      "Update the address: bank, insurance, employer, subscriptions",
      "Transfer or cancel electricity, internet and gas",
      "Set up mail forwarding",
    ],
    draft: () => null,
    missing: (d) => needs(d, [[/\d{1,2}[./-]\d{1,2}|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, "Moving date"], [/(street|str|straße|road|address|adresse)/i, "New address"]]),
  },
  email: {
    steps: ["Clarify the goal of the email", "Review the draft below", "Add recipient and personal details", "Send it from your own email account"],
    draft: (title, d) => `Subject: ${title}\n\nHello [NAME],\n\n${d || "[YOUR MESSAGE]"}\n\nBest regards,\n[YOUR NAME]`,
    missing: (d) => needs(d, [[/(@|mr|mrs|herr|frau|team|hello|hallo)/i, "Recipient"]]),
  },
  appointment: {
    steps: [
      "Write down the purpose and your key questions",
      "Collect the documents you need to bring",
      "Add the appointment to Life with a reminder",
      "Afterwards, save the outcome in Memory",
    ],
    draft: () => null,
    missing: (d) => needs(d, [[/\d{1,2}[./:]\d{1,2}/, "Date and time"], [/(at|bei|in|address|adresse|ort)/i, "Location"]]),
  },
  summarize: {
    steps: ["Upload or paste the document into Memory", "Open it and create a summary", "Extract tasks and deadlines", "Decide on next steps"],
    draft: () => null,
    missing: () => [],
  },
  custom: {
    steps: ["Describe the goal in one sentence", "List what you already have", "Break it into the next 3 concrete steps", "Set a deadline"],
    draft: () => null,
    missing: () => [],
  },
};
