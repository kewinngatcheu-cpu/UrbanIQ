/**
 * Illustrative, fictional data for the product concept visualisation.
 * Company names are invented. Scores are indicative prioritisation values,
 * not validated predictions or closing probabilities.
 */
export type Priority = "High" | "Medium" | "Low";

export const COMPANIES = [
  { name: "Corvane Systems", mono: "CS", industry: "B2B Software", meta: "140 employees · Hamburg", signal: "Hiring Head of Performance Marketing", opp: "Demand generation for DACH expansion", priority: "High" as Priority, score: 84 },
  { name: "Halvorsen Robotics", mono: "HR", industry: "Industrial Tech", meta: "320 employees · Munich", signal: "Series B financing announced", opp: "Brand & product launch campaign", priority: "High" as Priority, score: 79 },
  { name: "Arvento Health", mono: "AH", industry: "HealthTech", meta: "85 employees · Berlin", signal: "New product launch", opp: "Go-to-market support", priority: "Medium" as Priority, score: 71 },
  { name: "Nordlicht Foods", mono: "NF", industry: "Consumer Goods", meta: "450 employees · Bremen", signal: "New site in Vienna", opp: "Regional performance campaigns", priority: "Medium" as Priority, score: 66 },
  { name: "Pellara Finance", mono: "PF", industry: "FinTech", meta: "60 employees · Frankfurt", signal: "New CMO appointed", opp: "Marketing strategy review", priority: "Medium" as Priority, score: 62 },
  { name: "Siltrix Mobility", mono: "SM", industry: "Mobility", meta: "210 employees · Stuttgart", signal: "Website relaunch", opp: "Paid media & conversion", priority: "Low" as Priority, score: 48 },
];

export const SIGNALS = [
  { type: "Job posting", title: "Head of Performance Marketing", source: "Company careers page", when: "2 days ago", rel: "High" as Priority },
  { type: "Funding", title: "Series B financing announced", source: "Press release", when: "9 days ago", rel: "High" as Priority },
  { type: "Expansion", title: "New office opening in Vienna", source: "Company news", when: "3 weeks ago", rel: "Medium" as Priority },
  { type: "Product", title: "Fleet analytics module launched", source: "Company website", when: "4 weeks ago", rel: "Medium" as Priority },
  { type: "Growth", title: "Strong headcount growth", source: "Public company profile", when: "Last 12 months", rel: "Medium" as Priority },
  { type: "Strategy", title: "Shift towards mid-market customers", source: "Trade press interview", when: "6 weeks ago", rel: "Low" as Priority },
];

export const SCORES = [
  { label: "Strategic Fit", value: 88, note: "Matches your ideal customer profile" },
  { label: "Signal Relevance", value: 82, note: "4 recent signals within 30 days" },
  { label: "Potential Need", value: 76, note: "Market entry requires demand generation" },
  { label: "Opportunity Priority", value: 84, note: "Recommended to pursue this week" },
];

export const BRIEFING = [
  { h: "Company Overview", b: "B2B software for fleet operations. ~140 employees, headquartered in Hamburg, expanding into Austria." },
  { h: "Relevant Signals", b: "Hiring a Head of Performance Marketing · Series B announced · New office in Vienna." },
  { h: "Potential Business Need", b: "Scaling demand generation and paid acquisition for a new market entry." },
  { h: "Why This Company?", b: "Strong fit with your ideal customer profile and several growth signals in the last 30 days." },
  { h: "Suggested Approach", b: "Lead with a DACH market-entry case study and reach out to the incoming marketing lead." },
];

export const STAGES = ["Discovered", "Analyzing", "Qualified", "Prioritized", "In Progress"];

export const PIPELINE: { name: string; stage: number; p: Priority }[] = [
  { name: "Siltrix Mobility", stage: 0, p: "Low" },
  { name: "Ostrava Tools", stage: 0, p: "Medium" },
  { name: "Brenner Logistik", stage: 0, p: "Low" },
  { name: "Pellara Finance", stage: 1, p: "Medium" },
  { name: "Lumio Interiors", stage: 1, p: "Low" },
  { name: "Corvane Systems", stage: 2, p: "High" },
  { name: "Nordlicht Foods", stage: 2, p: "Medium" },
  { name: "Halvorsen Robotics", stage: 3, p: "High" },
  { name: "Arvento Health", stage: 3, p: "Medium" },
  { name: "Kestrel Analytics", stage: 4, p: "High" },
];
