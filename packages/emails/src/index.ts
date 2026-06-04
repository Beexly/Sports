import { colors, identity, microcopy } from "@sports/brand";

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return map[char] ?? char;
  });
}

export function emailHtmlShell({
  title,
  preview,
  body,
}: {
  title: string;
  preview: string;
  body: string;
}): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:${colors.deepSpace};color:${colors.text};font-family:Inter,Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${esc(preview)}</div><main style="max-width:640px;margin:0 auto;padding:32px 20px"><p style="color:${colors.ionBlue};font-weight:800;letter-spacing:.12em;text-transform:uppercase">${esc(identity.productName)}</p>${body}<hr style="border:0;border-top:1px solid ${colors.line};margin:28px 0"><p style="color:${colors.muted};font-size:12px;line-height:1.6">${esc(microcopy.disclaimer.standard)}</p></main></body></html>`;
}

export function welcomeEmail(name = "there"): string {
  return emailHtmlShell({
    title: `Welcome to ${identity.productName}`,
    preview: identity.position,
    body: `<h1 style="font-size:28px;line-height:1.1">Welcome, ${esc(name)}.</h1><p style="font-size:16px;line-height:1.7">${esc(identity.position)}</p><p style="font-size:16px;line-height:1.7">Galaxy reads price, timing, depth, and evidence before any signal is allowed to publish.</p>`,
  });
}

export function receiptEmail({
  plan,
  amount,
}: {
  plan: string;
  amount: string;
}): string {
  return emailHtmlShell({
    title: `${identity.productName} receipt`,
    preview: `Receipt for ${plan}`,
    body: `<h1>Receipt</h1><p>Plan: <strong>${esc(plan)}</strong></p><p>Amount: <strong style="font-variant-numeric:tabular-nums">${esc(amount)}</strong></p><p>Sender of record: ${esc(identity.legalName)}</p>`,
  });
}

export function weeklyRecapEmail({
  record,
  biggestMiss,
  lossRoomUrl,
}: {
  record: string;
  biggestMiss: string;
  lossRoomUrl: string;
}): string {
  return emailHtmlShell({
    title: `${identity.productName} weekly recap`,
    preview: `Week in review: ${record}`,
    body: `<h1>Week in review</h1><p style="font-size:24px;font-weight:900;font-variant-numeric:tabular-nums">${esc(record)}</p><p>Biggest miss: ${esc(biggestMiss)}</p><p>Losses stay visible because calibration needs the whole record.</p><p><a href="${esc(lossRoomUrl)}" style="color:${colors.ionBlue}">Open the Loss Room</a></p>`,
  });
}

export function passwordResetEmail(resetUrl: string): string {
  return emailHtmlShell({
    title: `${identity.productName} password reset`,
    preview: "Reset your password",
    body: `<h1>Password reset</h1><p>This link does one thing: resets your password.</p><p><a href="${esc(resetUrl)}" style="color:${colors.ionBlue}">Reset password</a></p>`,
  });
}
