const nodemailer = require('nodemailer');

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

async function sendNotificationEmail({ recipients = [], subject, heading, message, meta = [] }) {
  const config = getMailerConfig();
  if (!config || !recipients.length) {
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

  const safeMeta = meta.filter(Boolean);
  const text = [
    heading,
    '',
    message,
    ...(safeMeta.length ? ['', ...safeMeta] : []),
  ].join('\n');

  const htmlMeta = safeMeta.length
    ? `<ul style="padding-left:18px;margin:16px 0;">${safeMeta.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '';

  await transporter.sendMail({
    from: config.from,
    to: config.from,
    bcc: recipients.join(','),
    subject,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
        <h2 style="margin:0 0 12px;">${heading}</h2>
        <p style="margin:0 0 12px;line-height:1.6;">${message}</p>
        ${htmlMeta}
        <p style="margin-top:20px;color:#475569;">Smart Student Dairy Notification Center</p>
      </div>
    `,
  });

  return { skipped: false };
}

module.exports = {
  sendNotificationEmail,
};
