import "server-only";
import { env } from "@/lib/config/env";

/**
 * Transactional email. Uses Resend's HTTP API when RESEND_API_KEY + ONE_MAIL_FROM are set.
 * Otherwise returns { delivered: false } and callers fall back to a clearly labelled demo path.
 * (In Supabase mode, auth emails are sent by Supabase itself.)
 */
export function mailConfigured() {
  return !!(env.resendApiKey && env.mailFrom);
}

export async function sendMail(msg: { to: string; subject: string; heading: string; body: string; cta?: { label: string; url: string }; footer?: string }): Promise<{ delivered: boolean }> {
  if (!mailConfigured()) return { delivered: false };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.mailFrom,
      to: [msg.to],
      subject: msg.subject,
      html: renderHtml(msg),
      text: `${msg.heading}\n\n${msg.body}${msg.cta ? `\n\n${msg.cta.label}: ${msg.cta.url}` : ""}\n\n${msg.footer ?? ""}`,
    }),
  });
  if (!res.ok) {
    console.error("[mail] delivery failed", res.status, await res.text().catch(() => ""));
    throw new Error("We couldn't send the email. Please try again in a moment.");
  }
  return { delivered: true };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function renderHtml(m: { heading: string; body: string; cta?: { label: string; url: string }; footer?: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f8fbff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#23364d">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border:1px solid #e6edf5;border-radius:20px;padding:36px">
<tr><td style="font-size:18px;font-weight:600;letter-spacing:4px;color:#23364d">ONE</td></tr>
<tr><td style="padding-top:24px;font-size:22px;font-weight:600">${esc(m.heading)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#718096">${esc(m.body)}</td></tr>
${m.cta ? `<tr><td style="padding-top:28px"><a href="${esc(m.cta.url)}" style="display:inline-block;background:#438ed4;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600;font-size:15px">${esc(m.cta.label)}</a></td></tr>` : ""}
${m.footer ? `<tr><td style="padding-top:28px;font-size:12px;color:#718096">${esc(m.footer)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}
