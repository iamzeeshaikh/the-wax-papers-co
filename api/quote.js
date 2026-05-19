import { formidable } from 'formidable';
import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Parse multipart form data
  let fields = {}, files = {};
  try {
    const form = formidable({ maxFileSize: 20 * 1024 * 1024, keepExtensions: true });
    [fields, files] = await form.parse(req);
  } catch (err) {
    console.error('Form parse error:', err.message);
    return res.status(400).json({ error: 'Failed to parse form' });
  }

  const get = (key) => (Array.isArray(fields[key]) ? fields[key][0] : fields[key] || '').trim();

  // Honeypot
  if (get('website')) return res.status(200).json({ success: true });

  const name     = get('name');
  const email    = get('email');
  const phone    = get('phone');
  const message  = get('message');
  const product  = get('product');
  const company  = get('company');
  const quantity = get('quantity');
  const size     = get('size');
  const printing = get('printing');

  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  // Build HTML email
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
      <td style="padding:8px 12px;color:#444;border-bottom:1px solid #e8e0d4">${val}</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#2d5c3e;padding:24px 28px">
        <h1 style="color:#fff;margin:0;font-size:20px">New Quote Request — The Wax Papers</h1>
        ${product ? `<p style="color:#a3d4b0;margin:6px 0 0;font-size:14px">${product}</p>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e8e0d4">${rows}</table>
      ${files.artwork?.[0]?.size > 0 ? '<p style="padding:12px 28px;color:#666;font-size:13px">📎 Artwork file attached.</p>' : ''}
      <div style="padding:16px 28px;background:#f8f5ef;font-size:12px;color:#888">thewaxpapers.co</div>
    </div>`;

  // Attachments
  const attachments = [];
  const art = files.artwork?.[0];
  if (art && art.size > 0) {
    try {
      attachments.push({ filename: art.originalFilename || 'artwork', content: readFileSync(art.filepath) });
    } catch (_) {}
  }

  // Send via SMTP
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
      from:    `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to:      process.env.SMTP_TO,
      replyTo: email,
      subject: `Quote: ${product || 'General'} — ${name}`,
      html,
      attachments,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('SMTP error:', err.message);
    return res.status(500).json({ error: 'Email failed', detail: err.message });
  }
}
