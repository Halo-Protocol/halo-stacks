/**
 * Email notification module using Resend.
 * Falls back to logging when RESEND_API_KEY is not set.
 */
import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NOTIFICATION_FROM || "Halo Protocol <noreply@haloprotocol.xyz>";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    logger.info({ to: params.to, subject: params.subject }, "Email (dry-run, no RESEND_API_KEY)");
    return true;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "Resend API error");
      return false;
    }

    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send email");
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Notification Templates ---

export async function notifyContributionDue(
  email: string,
  circleName: string,
  round: number,
  amount: string,
  dueDate: string,
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Contribution due: ${circleName} Round ${round}`,
    html: `
      <h2>Contribution Reminder</h2>
      <p>Your contribution of <strong>${amount}</strong> for <strong>${circleName}</strong> (Round ${round}) is due by <strong>${dueDate}</strong>.</p>
      <p><a href="${process.env.NEXTAUTH_URL || "https://haloprotocol.xyz"}/circles">View Circle</a></p>
    `,
  });
}

export async function notifyBidWindowOpen(
  email: string,
  circleName: string,
  round: number,
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Bid window open: ${circleName} Round ${round}`,
    html: `
      <h2>Bidding is Open</h2>
      <p>The bid window for <strong>${circleName}</strong> (Round ${round}) is now open. Place your bid to receive the pool funds.</p>
      <p><a href="${process.env.NEXTAUTH_URL || "https://haloprotocol.xyz"}/circles">Place Bid</a></p>
    `,
  });
}

export async function notifyRoundSettled(
  email: string,
  circleName: string,
  round: number,
  winnerName: string,
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Round settled: ${circleName} Round ${round}`,
    html: `
      <h2>Round ${round} Settled</h2>
      <p><strong>${circleName}</strong> Round ${round} has been settled. The winner is <strong>${winnerName}</strong>.</p>
      <p><a href="${process.env.NEXTAUTH_URL || "https://haloprotocol.xyz"}/circles">View Details</a></p>
    `,
  });
}

export async function notifyRepaymentDue(
  email: string,
  circleName: string,
  amount: string,
  dueDate: string,
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Repayment due: ${circleName}`,
    html: `
      <h2>Repayment Reminder</h2>
      <p>Your repayment of <strong>${amount}</strong> for <strong>${circleName}</strong> is due by <strong>${dueDate}</strong>.</p>
      <p><a href="${process.env.NEXTAUTH_URL || "https://haloprotocol.xyz"}/circles">Make Payment</a></p>
    `,
  });
}
