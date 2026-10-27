// Orders from /checkout/. Every line is re-priced here from src/lib/order.mjs, so a
// tampered browser can never change what an order costs. The office gets the order
// (subject leads with the payment method); the buyer gets a copy. Spam signals only
// label the email, they never refuse an order (owner's rule: never drop a lead).
import Busboy from 'busboy'
import nodemailer from 'nodemailer'
import catalog from '../src/data/order-catalog.json' with { type: 'json' }
import { PACK_QTY, PACK_PRICE, MAX_PACKS, PAYMENT_METHODS, SHIP_COUNTRIES, COD_COUNTRIES, HANDLING_DAYS, TRANSIT_DAYS, money } from '../src/lib/order.mjs'
import { spamReasons } from './_spam.js'

export const config = { api: { bodyParser: false } }

// Packaging sites send every lead and order to exactly these two inboxes.
const RECIPIENTS = ['dev@zeecustomboxes.com', 'shanimazhar82@gmail.com']
const SITE = 'https://thewaxpapers.co'
const PHONE = '(503) 461-4788'
const MAX_FILE = 4 * 1024 * 1024
const FIELDS = ['name', 'email', 'phone', 'company', 'address1', 'address2', 'city', 'region', 'postal', 'country', 'notes', 'payment', 'items', 'ts', 'website']
const REQUIRED = ['name', 'email', 'phone', 'address1', 'city', 'region', 'postal']
const ALLOWED_EXT = /\.(pdf|ai|eps|svg|png|jpe?g|zip)$/i
const NAMES = new Map(Object.entries(catalog))

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ').trim()

function parse(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE, files: 1, fields: 40 } })
    const fields = {}; const files = []; let tooBig = false
    bb.on('field', (k, v) => { if (FIELDS.includes(k)) fields[k] = String(v).slice(0, k === 'items' ? 8000 : 2000).trim() })
    bb.on('file', (k, stream, info) => {
      const chunks = []
      stream.on('data', (c) => chunks.push(c))
      stream.on('limit', () => { tooBig = true })
      stream.on('end', () => {
        const content = Buffer.concat(chunks)
        if (content.length && !tooBig && ALLOWED_EXT.test(info.filename || '')) files.push({ filename: String(info.filename).replace(/[^\w.\-]+/g, '_').slice(-120), content })
      })
    })
    bb.on('error', reject)
    bb.on('close', () => resolve({ fields, files, tooBig }))
    req.pipe(bb)
  })
}

function orderRef() {
  const d = new Date()
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let tail = ''
  for (const b of crypto.getRandomValues(new Uint8Array(4))) tail += abc[b % abc.length]
  return `TWP-${ymd}-${tail}`
}

const hits = new Map()
function limited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000)
  list.push(now); hits.set(ip, list)
  return list.length > 8
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Method not allowed' }) }
  if (!String(req.headers['content-type'] || '').includes('multipart/form-data')) return res.status(400).json({ ok: false, error: 'Bad request' })

  let parsed
  try { parsed = await parse(req) } catch { return res.status(400).json({ ok: false, error: 'Could not read the order' }) }
  const v = parsed.fields

  if (REQUIRED.some((k) => !v[k]) || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(v.email || '')) return res.status(422).json({ ok: false, error: 'Please fill in every required field' })
  const country = SHIP_COUNTRIES.find((c) => c.code === (v.country || 'US'))
  if (!country) return res.status(422).json({ ok: false, error: 'Online orders ship within the United States; request a quote for other countries' })
  const method = PAYMENT_METHODS.find((m) => m.id === v.payment)
  if (!method) return res.status(422).json({ ok: false, error: 'Choose a payment method' })
  if (method.id === 'cod' && !COD_COUNTRIES.includes(country.code)) return res.status(422).json({ ok: false, error: 'Cash on delivery is for US addresses' })

  // Never trust the browser's prices: rebuild every line from the catalog.
  let raw = []
  try { raw = JSON.parse(v.items || '[]') } catch {}
  const lines = (Array.isArray(raw) ? raw : []).slice(0, 30)
    .map((l) => ({ slug: String(l?.slug || ''), packs: Math.floor(Number(l?.packs)) }))
    .filter((l) => NAMES.has(l.slug) && l.packs >= 1 && l.packs <= MAX_PACKS)
    .map((l) => ({ name: NAMES.get(l.slug), url: `${SITE}/products/${l.slug}/`, qty: l.packs * PACK_QTY, total: l.packs * PACK_PRICE }))
  if (!lines.length) return res.status(422).json({ ok: false, error: 'Your order is empty' })
  const total = lines.reduce((s, l) => s + l.total, 0)

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (limited(ip)) return res.status(429).json({ ok: false, error: 'Too many orders from this connection, please call us' })

  const spam = []
  if (v.website) spam.push('hidden field filled')
  if (parsed.tooBig) spam.push('attachment over 4 MB dropped')
  spam.push(...spamReasons({ names: [v.name], email: v.email, phone: v.phone, message: v.notes || '', fields: { Company: v.company || '' }, sentAt: v.ts }))
  const spamLine = spam.length ? `Spam check: ${spam.join('; ')}` : ''

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_FROM_EMAIL } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('[order] SMTP not configured')
    return res.status(503).json({ ok: false, error: 'We could not send your order' })
  }
  const mailer = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT || 587), secure: String(SMTP_SECURE || 'false') === 'true', auth: { user: SMTP_USER, pass: SMTP_PASS } })
  const from = `"The Wax Papers" <${SMTP_FROM_EMAIL || SMTP_USER}>`

  const ref = orderRef()
  const address = [v.address1, v.address2, [v.city, v.region, v.postal].filter(Boolean).join(', '), country.name].filter(Boolean).join('\n')
  const payLine = method.id === 'cod' ? 'Cash on delivery: the customer pays when the order arrives' : `${method.name}: send the invoice after the customer approves the proof`
  const itemText = lines.map((l) => `- ${l.name}: ${l.qty.toLocaleString('en-US')} sheets, ${money(l.total)}`).join('\n')
  const td = 'style="padding:6px 12px;border-bottom:1px solid #e3e5e8"'
  const itemHtml = `<table style="font-family:sans-serif;border-collapse:collapse">${lines.map((l) => `<tr><td ${td}><a href="${l.url}">${esc(l.name)}</a></td><td ${td}>${l.qty.toLocaleString('en-US')} sheets</td><td ${td} align="right">${money(l.total)}</td></tr>`).join('')}<tr><td ${td}>Shipping</td><td ${td}></td><td ${td} align="right">Free</td></tr><tr><th align="left" ${td}>Total</th><td ${td}></td><th ${td} align="right">${money(total)}</th></tr></table>`
  const office = [
    `PAYMENT: ${payLine}`, spamLine, `Order ${ref}`, '', itemText, `Total: ${money(total)} (free shipping)`, '',
    `Name: ${v.name}`, `Email: ${v.email}`, `Phone: ${v.phone}`, v.company ? `Business: ${v.company}` : '',
    '', 'Ship to:', address, '', v.notes ? `Notes: ${v.notes}` : '', 'Site: thewaxpapers.co',
  ].filter((x) => x !== '').join('\n')

  try {
    await mailer.sendMail({
      from, to: RECIPIENTS, replyTo: `"${oneLine(v.name)}" <${oneLine(v.email)}>`,
      subject: `${spam.length ? '[Possible spam] ' : ''}New order ${ref}: ${money(total)}, ${method.name} | thewaxpapers.co`,
      text: office,
      html: `<p style="font-family:sans-serif;font-size:16px;background:#fff4cc;padding:10px 12px"><b>PAYMENT:</b> ${esc(payLine)}</p>${spamLine ? `<p style="font-family:sans-serif;background:#fde3d8;padding:8px 12px">${esc(spamLine)}</p>` : ''}<h2 style="font-family:sans-serif">Order ${ref}</h2>${itemHtml}<p style="font-family:sans-serif">${esc(v.name)}<br>${esc(v.email)}<br>${esc(v.phone)}${v.company ? `<br>${esc(v.company)}` : ''}</p><p style="font-family:sans-serif"><b>Ship to</b><br>${esc(address).replace(/\n/g, '<br>')}</p>${v.notes ? `<p style="font-family:sans-serif"><b>Notes</b><br>${esc(v.notes).replace(/\n/g, '<br>')}</p>` : ''}`,
      attachments: parsed.files,
    })
  } catch (err) {
    console.error('[order] send failed', err && err.message, ref)
    return res.status(502).json({ ok: false, error: 'We could not send your order' })
  }

  // The buyer's copy is a courtesy; if it fails the order still stands.
  const steps = ['We check your artwork and email a free digital proof.', 'You approve the proof or ask for changes. Nothing prints before you approve.', method.detail, `Production takes ${HANDLING_DAYS[0]}–${HANDLING_DAYS[1]} business days, then your order ships free by ground and arrives in ${TRANSIT_DAYS[0]}–${TRANSIT_DAYS[1]} business days.`]
  try {
    await mailer.sendMail({
      from, to: `"${oneLine(v.name)}" <${oneLine(v.email)}>`, replyTo: 'info@thewaxpapers.co',
      subject: `Your order ${ref} with The Wax Papers`,
      text: [`Hi ${v.name},`, '', `Thank you for your order ${ref}.`, '', itemText, 'Shipping: free', `Total: ${money(total)}`, `Payment: ${method.name}`, '', 'What happens next:', ...steps.map((s, i) => `${i + 1}. ${s}`), '', `Ship to:\n${address}`, '', `Questions? Call ${PHONE} or reply to this email.`, 'The Wax Papers'].join('\n'),
      html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.5"><p>Hi ${esc(v.name)},</p><p>Thank you for your order <b>${ref}</b>.</p>${itemHtml}<p><b>Payment:</b> ${esc(method.name)}</p><p><b>What happens next</b></p><ol>${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><p><b>Ship to</b><br>${esc(address).replace(/\n/g, '<br>')}</p><p>Questions? Call ${PHONE} or reply to this email.</p><p>The Wax Papers</p></div>`,
    })
  } catch (err) {
    console.error('[order] buyer copy failed', err && err.message, ref)
  }

  return res.status(200).json({ ok: true, ref, total, payment: method.id })
}
