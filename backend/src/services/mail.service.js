const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

function getMailProvider() {
  const explicitProvider = String(process.env.MAIL_PROVIDER || '').trim().toLowerCase();
  if (explicitProvider) return explicitProvider;
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) return 'sendgrid';
  return 'dev';
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function isDevProvider() {
  return getMailProvider() === 'dev';
}

function assertMailProviderReady() {
  const provider = getMailProvider();

  if (provider === 'sendgrid') {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      throw Object.assign(new Error('SendGrid is not configured. Please set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.'), { statusCode: 500 });
    }
    return;
  }

  if (provider === 'dev' && isProduction()) {
    throw Object.assign(new Error('Email provider is not configured for production. Please configure SendGrid.'), { statusCode: 500 });
  }

  if (provider !== 'dev') {
    throw Object.assign(new Error(`Unsupported mail provider: ${provider}`), { statusCode: 500 });
  }
}

function buildResetPasswordTemplate({ fullName, resetUrl, expiresInMinutes }) {
  const displayName = fullName || 'ban';
  const minutes = Number(expiresInMinutes || 30);
  const subject = '[Kinh Tot] Dat lai mat khau';
  const text = [
    `Xin chao ${displayName},`,
    '',
    'Chung toi da nhan duoc yeu cau dat lai mat khau.',
    `Link dat lai mat khau (hieu luc ${minutes} phut):`,
    resetUrl,
    '',
    'Neu ban khong thuc hien yeu cau nay, vui long bo qua email nay.',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1a1a1a">
      <p>Xin chao <strong>${displayName}</strong>,</p>
      <p>Chung toi da nhan duoc yeu cau dat lai mat khau.</p>
      <p>Link dat lai mat khau (hieu luc ${minutes} phut):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Neu ban khong thuc hien yeu cau nay, vui long bo qua email nay.</p>
    </div>
  `;

  return { subject, text, html };
}

async function sendWithSendGrid({ to, subject, text, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw Object.assign(new Error(`SendGrid send failed (${response.status}): ${responseBody}`), { statusCode: 500 });
  }
}

async function sendResetPasswordEmail({ to, fullName, resetUrl, expiresInMinutes }) {
  assertMailProviderReady();
  const provider = getMailProvider();
  const template = buildResetPasswordTemplate({ fullName, resetUrl, expiresInMinutes });

  if (provider === 'sendgrid') {
    await sendWithSendGrid({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    return { provider: 'sendgrid' };
  }

  console.log('[DevMailProvider] Reset password link:', resetUrl);
  return { provider: 'dev', devResetUrl: resetUrl };
}

module.exports = {
  sendResetPasswordEmail,
  assertMailProviderReady,
  isDevProvider,
};
