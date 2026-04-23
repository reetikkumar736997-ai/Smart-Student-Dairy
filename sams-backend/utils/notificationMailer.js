const nodemailer = require('nodemailer');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user, pass },
    from,
  };
}

function getBrevoApiConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!apiKey || !from) {
    return null;
  }

  return {
    apiKey,
    from,
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMessageContent({ heading, message, meta }) {
  const safeMeta = meta.filter(Boolean);
  const text = [
    heading,
    '',
    message,
    ...(safeMeta.length ? ['', ...safeMeta] : []),
  ].join('\n');

  const htmlMeta = safeMeta.length
    ? `<ul style="padding-left:18px;margin:16px 0;">${safeMeta.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 12px;">${escapeHtml(heading)}</h2>
      <p style="margin:0 0 12px;line-height:1.6;">${escapeHtml(message)}</p>
      ${htmlMeta}
      <p style="margin-top:20px;color:#475569;">Smart Student Dairy Notification Center</p>
    </div>
  `;

  return { text, html };
}

async function sendWithBrevoApi({ recipients, subject, heading, message, meta }) {
  const config = getBrevoApiConfig();
  if (!config) {
    return null;
  }

  const { text, html } = buildMessageContent({ heading, message, meta });
  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': config.apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'Smart Student Dairy',
        email: config.from,
      },
      to: recipients.map((email) => ({ email })),
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Brevo API email failed: ${response.status} ${errorText}`);
  }

  return { skipped: false, provider: 'brevo-api' };
}

async function sendNotificationEmail({ recipients = [], subject, heading, message, meta = [] }) {
  if (!recipients.length) {
    return { skipped: true };
  }

  const brevoApiResult = await sendWithBrevoApi({ recipients, subject, heading, message, meta });
  if (brevoApiResult) {
    return brevoApiResult;
  }

  const config = getMailerConfig();
  if (!config) {
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.verify();

  const { text, html } = buildMessageContent({ heading, message, meta });

  const fromLabel = `Smart Student Dairy <${config.from}>`;
  const sendResults = await Promise.allSettled(
    recipients.map((recipient) =>
      transporter.sendMail({
        from: fromLabel,
        to: recipient,
        subject,
        text,
        html,
      })
    )
  );

  const failedDeliveries = sendResults.filter((result) => result.status === 'rejected');
  if (failedDeliveries.length === sendResults.length) {
    throw failedDeliveries[0].reason;
  }

  if (failedDeliveries.length) {
    console.error(`Notification email partially failed: ${failedDeliveries.length}/${sendResults.length}`);
  }

  return { skipped: false, provider: 'smtp' };
}

module.exports = {
  sendNotificationEmail,
};
