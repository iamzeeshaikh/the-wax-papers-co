// One price, one shipping story and one set of payment methods for every surface that
// sells: the product-page order box, the Product Offer JSON-LD, the Merchant feed, the
// checkout and api/order.js (which imports this file too, so it is plain JS).
//
// Owner's decisions, 2026-10-27: every product sells online in runs of 1,000 sheets for
// $40.00 on the standard printed build, free shipping to the US, UK, Canada and Australia
// (owner 2026-10-27: "USA, UK, CA, AUS sab men"), paid by
// PayPal invoice, bank transfer invoice, or cash on delivery. Smaller runs (from 500
// sheets), special sizes, materials and finishes still go through the quote form.

export const PACK_QTY = 1000
export const PACK_PRICE = 40
export const MAX_PACKS = 50
export const CURRENCY = 'USD'
export const money = (n) => `$${Number(n).toFixed(2)}`
export const PACK_PRICE_TEXT = PACK_PRICE.toFixed(2)
export const PACK_LINE = `${PACK_QTY.toLocaleString('en-US')} sheets for ${money(PACK_PRICE)}`

/** Production after proof approval, then transit, in business days. TRANSIT_DAYS is the US
 * ground figure; each country below carries its own transit window. */
export const HANDLING_DAYS = [8, 12]
export const TRANSIT_DAYS = [2, 5]
export const INTL_TRANSIT_DAYS = [5, 10]

export const SHIP_COUNTRIES = [
  { code: 'US', name: 'United States', transit: TRANSIT_DAYS },
  { code: 'GB', name: 'United Kingdom', transit: INTL_TRANSIT_DAYS },
  { code: 'CA', name: 'Canada', transit: INTL_TRANSIT_DAYS },
  { code: 'AU', name: 'Australia', transit: INTL_TRANSIT_DAYS },
]
export const SHIP_LINE = 'Free shipping to the US, UK, Canada and Australia'
export const TRANSIT_LINE = `${TRANSIT_DAYS[0]}–${TRANSIT_DAYS[1]} business days in the US, ${INTL_TRANSIT_DAYS[0]}–${INTL_TRANSIT_DAYS[1]} to the UK, Canada and Australia`

export const PAYMENT_METHODS = [
  {
    id: 'paypal',
    name: 'PayPal invoice',
    detail: 'We email a PayPal invoice once you approve your free digital proof. Pay with your PayPal balance or a card through PayPal. Production starts when it is paid.',
  },
  {
    id: 'bank',
    name: 'Bank transfer invoice',
    detail: 'We email an invoice with our bank details once you approve your free digital proof. Production starts when the transfer arrives.',
  },
  {
    id: 'cod',
    name: 'Cash on delivery',
    detail: 'Nothing is paid up front. You pay the order total when your papers are delivered. Available for US addresses.',
  },
]
export const COD_COUNTRIES = ['US']
export const PAYMENT_LINE = 'Pay by PayPal invoice or bank transfer after you approve your free proof, or cash on delivery in the US.'
