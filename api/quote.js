import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = {};
  try {
    // Read raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    body = JSON.parse(raw);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Visitor input: coerce to string, trim, cap length (truncate, never reject)
  // and keep CR/LF out of anything that ends up in a mail header.
  const field = (key, max) => String(body[key] ?? '').trim().slice(0, max);
  const line = (v) => v.replace(/[\r\n]+/g, ' ').trim();
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const name     = line(field('name', 200));
  const email    = line(field('email', 254));
  const phone    = line(field('phone', 100));
  const company  = line(field('company', 200));
  const product  = line(field('product', 200));
  const quantity = line(field('quantity', 100));
  const size     = line(field('size', 200));
  const printing = line(field('printing', 200));
  const message  = field('message', 5000);
  const website  = field('website', 200);

  // Honeypot: never drop an enquiry — label the subject and still send.
  const spamPrefix = website ? '[Possible spam] ' : '';
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  const replyTo = /^[^\s@<>,;"']+@[^\s@<>,;"']+\.[A-Za-z0-9-]+$/.test(email) ? email : undefined;

  const rows = [
    ['Product',  product  || '—'],
    ['Name',     name],
    ['Email',    email],
    ['Phone',    phone    || '—'],
    ['Company',  company  || '—'],
    ['Quantity', quantity || '—'],
    ['Size',     size     || '—'],
    ['Printing', printing || '—'],
    ['Message',  message  || '—'],
  ].map(([label, val]) =>
    `<tr>
      <td style="padding:8px 12px;font-weight:600;background:#f8f5ef;color:#3b2a1a;width:120px;border-bottom:1px solid #e8e0d4">${label}</td>
      <td style="padding:8px 12px;color:#444;border-bottom:1px solid #e8e0d4">${esc(val).replace(/\n/g, '<br>')}</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#2d5c3e;padding:24px 28px">
        <h1 style="color:#fff;margin:0;font-size:20px">New Quote Request — The Wax Papers</h1>
        ${product ? `<p style="color:#a3d4b0;margin:6px 0 0;font-size:14px">${esc(product)}</p>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e8e0d4">${rows}</table>
      <div style="padding:16px 28px;background:#f8f5ef;font-size:12px;color:#888">thewaxpapers.co</div>
    </div>`;

  const attachments = [];
  if (body.artwork && body.artworkName) {
    attachments.push({
      filename:    line(field('artworkName', 200)) || 'artwork',
      content:     Buffer.from(String(body.artwork), 'base64'),
      contentType: line(field('artworkType', 100)) || 'application/octet-stream',
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from:        `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to:          process.env.SMTP_TO,
      replyTo,
      subject:     `${spamPrefix}Quote: ${product || 'General'} — ${name}`,
      html,
      attachments,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    // Detail stays in the server log; the visitor gets a generic message.
    console.error('SMTP error:', err.message);
    return res.status(500).json({ error: 'Email failed. Please try again or email us directly.' });
  }
}
