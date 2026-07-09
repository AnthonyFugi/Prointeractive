import nodemailer from 'nodemailer';

const apiConfigured = () => !!process.env.BREVO_API_KEY;
const configured = () => apiConfigured() || !!process.env.SMTP_HOST;

let transporter = null;
const getTransport = () => {
  if (!transporter && configured()) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
};

const APP_URL = () =>
  process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';
const FROM = () => process.env.EMAIL_FROM || 'Prointeractive <no-reply@prointeractive.local>';

/** Branded HTML wrapper: navy header, red CTA, caption in the footer. */
const template = ({ heading, lines = [], ctaText, ctaPath }) => `
<div style="background:#fafafa;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#000">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e4e4;border-radius:10px;overflow:hidden">
    <div style="background:#002368;color:#fff;padding:16px 24px;font-size:18px;font-weight:bold">
      Pro<span style="color:#ff9d9d">&middot;</span>interactive
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 12px;color:#000">${heading}</h2>
      ${lines.map((l) => `<p style="margin:0 0 10px;line-height:1.5">${l}</p>`).join('')}
      ${ctaText ? `<p style="margin:20px 0 4px">
        <a href="${APP_URL()}${ctaPath}" style="background:#bc0000;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;display:inline-block">${ctaText}</a>
      </p>` : ''}
    </div>
    <div style="padding:14px 24px;border-top:1px solid #e4e4e4;color:#666;font-size:12px">
      Making business interaction, Easy!
    </div>
  </div>
</div>`;

/** Parse 'Name <email@x.com>' into Brevo's sender shape. */
const parseFrom = () => {
  const raw = FROM();
  const m = raw.match(/^(.*)<\s*([^>]+)\s*>$/);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim() };
  return { email: raw.trim() };
};

/** Send via Brevo's HTTPS API (port 443 — works even where SMTP ports are blocked). */
const sendViaApi = async ({ to, subject, html }) => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseFrom(),
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Brevo API error ${res.status}`);
  return data.messageId;
};

/** Fire-and-forget safe sender. Prefers the HTTPS API; falls back to SMTP. */
export const sendEmail = async ({ to, subject, ...content }) => {
  if (!to) return;
  if (!configured()) {
    console.log(`[email skipped — email not configured] to=${to} subject="${subject}"`);
    return;
  }
  const html = template(content);
  try {
    if (apiConfigured()) {
      const id = await sendViaApi({ to, subject, html });
      console.log(`[email sent via api] to=${to} subject="${subject}" id=${id}`);
    } else {
      const info = await getTransport().sendMail({ from: FROM(), to, subject, html });
      console.log(`[email sent via smtp] to=${to} subject="${subject}" id=${info.messageId}`);
    }
  } catch (err) {
    console.error(`[email failed] to=${to} subject="${subject}":`, err.message);
  }
};

// ---------- Notification helpers ----------

export const welcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Welcome to Prointeractive',
    heading: `Welcome, ${user.name}!`,
    lines: [
      user.role === 'business'
        ? 'Your business account is ready. Set up your storefront, list products, and start receiving orders and customer messages.'
        : 'Your account is ready. Browse products, buy from local businesses, and message sellers directly.',
    ],
    ctaText: user.role === 'business' ? 'Set up your storefront' : 'Start shopping',
    ctaPath: user.role === 'business' ? '/dashboard' : '/',
  });

export const orderPlacedEmails = ({ order, customer, ownerEmail, businessName }) => {
  const itemsLine = order.items.map((i) => `${i.quantity} × ${i.name}`).join(', ');
  sendEmail({
    to: customer.email,
    subject: `Order placed with ${businessName}`,
    heading: 'Your order is in',
    lines: [
      `You ordered: ${itemsLine}.`,
      `Total: ${order.currency} ${order.totalAmount.toFixed(2)}. ${businessName} will confirm payment and delivery.`,
    ],
    ctaText: 'Track your order',
    ctaPath: '/orders',
  });
  sendEmail({
    to: ownerEmail,
    subject: `New order from ${customer.name}`,
    heading: 'You have a new order',
    lines: [
      `${customer.name} ordered: ${itemsLine}.`,
      `Total: ${order.currency} ${order.totalAmount.toFixed(2)}.`,
    ],
    ctaText: 'View in your dashboard',
    ctaPath: '/dashboard',
  });
};

export const orderStatusEmail = ({ order, customerEmail, businessName }) =>
  sendEmail({
    to: customerEmail,
    subject: `Order ${order.status} — ${businessName}`,
    heading: `Your order is ${order.status}`,
    lines: [`${businessName} updated your order of ${order.items.length} item(s) to “${order.status}”.`],
    ctaText: 'View order',
    ctaPath: '/orders',
  });

export const passwordResetEmail = ({ to, name, token }) =>
  sendEmail({
    to,
    subject: 'Reset your Prointeractive password',
    heading: `Password reset, ${name}`,
    lines: [
      'We received a request to reset your password. The link below is valid for 15 minutes and can be used once.',
      'If you didn\'t request this, you can safely ignore this email — your password stays unchanged.',
    ],
    ctaText: 'Choose a new password',
    ctaPath: `/reset-password?token=${token}`,
  });

export const inquiryEmail = ({ to, fromName, subject, preview, inquiryId }) =>
  sendEmail({
    to,
    subject: `New message from ${fromName}: ${subject}`,
    heading: 'You have a new message',
    lines: [`<em>“${String(preview).slice(0, 140)}”</em>`, `From ${fromName}, in the thread “${subject}”.`],
    ctaText: 'Reply in your inbox',
    ctaPath: `/inbox/${inquiryId}`,
  });
