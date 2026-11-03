import type { ActionType } from "@/lib/db/types";

export const ACTION_TYPES: { type: ActionType; label: string; description: string; emoji: string }[] = [
  { type: "cancellation", label: "Cancel a contract", description: "Gym, phone, subscription, insurance…", emoji: "✂️" },
  { type: "complaint", label: "File a complaint", description: "Defective product, bad service, refund", emoji: "📣" },
  { type: "understand_invoice", label: "Understand an invoice", description: "What is charged, is it correct, what to do", emoji: "🧾" },
  { type: "move", label: "Organise a move", description: "Address changes, utilities, checklist", emoji: "📦" },
  { type: "email", label: "Write an email", description: "Clear, polite and to the point", emoji: "✉️" },
  { type: "appointment", label: "Prepare an appointment", description: "Doctor, authority, bank, meeting", emoji: "📅" },
  { type: "summarize", label: "Summarise a document", description: "Key points and what it means for you", emoji: "📄" },
  { type: "reply_letter", label: "Reply to a letter", description: "Landlord, bank, insurance, school…", emoji: "📨" },
  { type: "authority", label: "Handle an authority matter", description: "Registration, tax office, permits", emoji: "🏛️" },
  { type: "custom", label: "Something else", description: "Describe what you need", emoji: "✨" },
];

export const BUSINESS_ACTION_TYPES: { type: ActionType; label: string; description: string; emoji: string }[] = [
  { type: "client_process", label: "Structure a client process", description: "Onboarding, delivery, follow-up", emoji: "🤝" },
  { type: "analyze_document", label: "Analyse a business document", description: "Key facts, risks, obligations", emoji: "📑" },
  { type: "contract_deadlines", label: "Check contract deadlines", description: "Terms, notice periods, renewals", emoji: "⏳" },
  { type: "offer", label: "Prepare an offer", description: "Scope, price, terms, next steps", emoji: "💼" },
  { type: "business_email", label: "Write a business email", description: "Clients, partners, suppliers", emoji: "✉️" },
  { type: "meeting_tasks", label: "Turn a meeting into tasks", description: "Decisions, owners, deadlines", emoji: "🗓️" },
  { type: "document_process", label: "Document an internal process", description: "Steps, roles, checklist", emoji: "🧭" },
  { type: "follow_up", label: "Track an open matter", description: "Who owes what, by when", emoji: "📌" },
];

export function actionLabel(type: ActionType) {
  return [...ACTION_TYPES, ...BUSINESS_ACTION_TYPES].find((a) => a.type === type)?.label ?? "Action";
}

interface Template {
  steps: string[];
  draft: (title: string, details: string) => string | null;
  /** German version of the draft (letters must read naturally, not word-by-word). */
  draftDe?: (title: string, details: string) => string | null;
  missing: (details: string) => string[];
}

const needs = (details: string, checks: [RegExp, string][]) => checks.filter(([re]) => !re.test(details)).map(([, label]) => label);

const BUSINESS_TEMPLATES: Record<string, Template> = {
  client_process: {
    steps: ["Define the goal and the client's expected outcome", "List the stages (e.g. onboarding, delivery, follow-up)", "Assign an owner and a deadline to each stage", "Collect the documents and information needed", "Agree on how and when the client is updated", "Review the process after the first run"],
    draft: () => null, missing: (d) => needs(d, [[/[A-Z][a-z]+/, "Client name"], [/\d{1,2}[./-]\d{1,2}|week|woche|month|monat/i, "Timeline"]]),
  },
  analyze_document: {
    steps: ["Save the document in Business Memory", "Identify parties, amounts, dates and obligations", "Mark risks and unclear clauses", "Extract deadlines and responsible people", "Decide next steps and assign them"],
    draft: () => null, missing: () => [],
  },
  contract_deadlines: {
    steps: ["Collect the relevant contracts in Business Memory", "Note start date, term and notice period for each", "Calculate the latest cancellation / renewal date", "Create a deadline task with an owner for each contract", "Decide: renew, renegotiate or cancel"],
    draft: () => null, missing: (d) => needs(d, [[/\d{1,2}[./-]\d{1,2}|\d{4}/, "Contract dates"], [/(month|monat|year|jahr|week|woche)/i, "Notice period"]]),
  },
  offer: {
    steps: ["Clarify the client's need and scope", "Define deliverables and exclusions", "Calculate price and payment terms", "Review the offer draft below", "Send it yourself and set a follow-up date"],
    draft: (title, d) => `Subject: Offer — ${title}\n\nDear [CLIENT NAME],\n\nThank you for your enquiry. Please find our offer below.\n\nScope:\n- ${d || "[DELIVERABLE 1]"}\n- [DELIVERABLE 2]\n\nPrice: [AMOUNT] (plus VAT)\nTimeline: [TIMELINE]\nValid until: [DATE]\n\nWe look forward to working with you.\n\nKind regards,\n[YOUR NAME]\n[COMPANY]`,
    draftDe: (title, d) => `Betreff: Angebot — ${title}\n\nSehr geehrte/r [NAME],\n\nvielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot.\n\nLeistungsumfang:\n- ${d || "[LEISTUNG 1]"}\n- [LEISTUNG 2]\n\nPreis: [BETRAG] (zzgl. MwSt.)\nZeitraum: [ZEITRAUM]\nGültig bis: [DATUM]\n\nWir freuen uns auf die Zusammenarbeit.\n\nMit freundlichen Grüßen\n[DEIN NAME]\n[UNTERNEHMEN]`,
    missing: (d) => needs(d, [[/(€|eur|\d+[.,]\d{2})/i, "Price"], [/[A-Z][a-z]+/, "Client name"]]),
  },
  business_email: {
    steps: ["Clarify the goal and the recipient", "Review the draft below", "Add names, figures and attachments", "Send it from your company email"],
    draft: (title, d) => `Subject: ${title}\n\nDear [NAME],\n\n${d || "[YOUR MESSAGE]"}\n\nKind regards,\n[YOUR NAME]\n[COMPANY]`,
    draftDe: (title, d) => `Betreff: ${title}\n\nSehr geehrte/r [NAME],\n\n${d || "[IHRE NACHRICHT]"}\n\nMit freundlichen Grüßen\n[DEIN NAME]\n[UNTERNEHMEN]`,
    missing: (d) => needs(d, [[/(@|mr|mrs|herr|frau|team|dear|hallo)/i, "Recipient"]]),
  },
  meeting_tasks: {
    steps: ["Paste or upload the meeting notes", "List the decisions that were made", "Turn every open point into a task", "Assign an owner and a deadline to each task", "Share the summary with the participants"],
    draft: () => null, missing: () => [],
  },
  document_process: {
    steps: ["Name the process and its goal", "Describe the trigger and the result", "Write down each step in order", "Assign a role to each step", "Add the checklist to Business Memory"],
    draft: () => null, missing: () => [],
  },
  follow_up: {
    steps: ["Describe the open matter in one sentence", "Note who has to deliver what", "Set the date to follow up", "Send a short reminder if nothing happens", "Close the matter when it's done"],
    draft: () => null, missing: (d) => needs(d, [[/\d{1,2}[./-]\d{1,2}|tomorrow|morgen|week|woche/i, "Follow-up date"]]),
  },
};

const PERSONAL_EXTRA: Record<string, Template> = {
  reply_letter: {
    steps: ["Save the letter in Memory", "Write down what is being asked of you and by when", "Collect the documents you need", "Review the reply draft below", "Send it yourself and save a copy"],
    draft: (title, d) => `Subject: Re: ${title}\n\nDear Sir or Madam,\n\nThank you for your letter of [DATE] regarding ${d || "[TOPIC]"}.\n\n[YOUR ANSWER]\n\nKind regards,\n[YOUR NAME]`,
    draftDe: (title, d) => `Betreff: Ihr Schreiben — ${title}\n\nSehr geehrte Damen und Herren,\n\nvielen Dank für Ihr Schreiben vom [DATUM] bezüglich ${d || "[THEMA]"}.\n\n[DEINE ANTWORT]\n\nMit freundlichen Grüßen\n[DEIN NAME]`,
    missing: (d) => needs(d, [[/\d{1,2}[./-]\d{1,2}/, "Date of the letter"]]),
  },
  authority: {
    steps: ["Find out which office is responsible", "Check the required documents and fees", "Book an appointment or prepare the online form", "Collect the documents in Memory", "Note the reference number and follow up"],
    draft: () => null, missing: (d) => needs(d, [[/(amt|office|behörde|authority|bürgeramt|finanzamt)/i, "Responsible office"]]),
  },
};

const PERSONAL_TEMPLATES: Record<string, Template> = {
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
    draftDe: (title, d) =>
      `Betreff: Kündigung meines Vertrags\n\nSehr geehrte Damen und Herren,\n\nhiermit kündige ich meinen Vertrag${/\d{4,}/.test(d) ? ` (Kunden-/Vertragsnummer ${d.match(/\d{4,}/)![0]})` : " (Kunden-/Vertragsnummer [NUMMER])"} fristgerecht zum nächstmöglichen Zeitpunkt.\n\nBitte senden Sie mir eine schriftliche Bestätigung der Kündigung unter Angabe des Beendigungsdatums.\n\nEiner weiteren Nutzung meiner Daten für Werbezwecke widerspreche ich.\n\nMit freundlichen Grüßen\n[DEIN NAME]\n[DEINE ADRESSE]\n\n— Kontext: ${title}`,
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
    draftDe: (title, d) =>
      `Betreff: Reklamation — ${title}\n\nSehr geehrte Damen und Herren,\n\nich möchte Folgendes reklamieren: ${d || "[PROBLEM BESCHREIBEN]"}.\n\nBestell-/Referenznummer: [NUMMER]\nKaufdatum: [DATUM]\n\nBitte [reparieren / ersetzen / erstatten] Sie dies innerhalb von 14 Tagen.\n\nMit freundlichen Grüßen\n[DEIN NAME]`,
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
    draftDe: (title, d) => `Betreff: ${title}\n\nHallo [NAME],\n\n${d || "[DEINE NACHRICHT]"}\n\nViele Grüße\n[DEIN NAME]`,
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

export const TEMPLATES = {
  ...PERSONAL_TEMPLATES,
  ...PERSONAL_EXTRA,
  ...BUSINESS_TEMPLATES,
} as unknown as Record<ActionType, Template>;
