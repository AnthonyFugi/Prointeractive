/**
 * Phone numbers and WhatsApp links.
 *
 * Zambian numbers arrive in every shape a person might type them:
 *   0977123456, +260977123456, 260 977 123 456, 0977-123-456, 097 712 3456
 * All of those are the same number. Storing them as typed means a WhatsApp
 * link works for one seller and silently fails for the next, so everything is
 * normalised to E.164 (+260977123456) on the way in and prettified on the way
 * out.
 */

const ZM_CC = '260';

/**
 * Normalise to E.164, or return '' if it can't be understood.
 *
 * Returning empty rather than guessing is deliberate: a wrong number sends a
 * customer's message to a stranger, which is worse than showing no button.
 */
export const normalizePhone = (input, countryCode = ZM_CC) => {
  if (!input) return '';
  let d = String(input).replace(/[^\d+]/g, '');

  if (d.startsWith('+')) d = d.slice(1);
  // 00 international prefix, still common on older handsets
  if (d.startsWith('00')) d = d.slice(2);

  if (d.startsWith(countryCode)) {
    const rest = d.slice(countryCode.length);
    return isValidZmSubscriber(rest) ? `+${countryCode}${rest}` : '';
  }
  // Local format: leading 0 then a 9-digit subscriber number
  if (d.startsWith('0')) {
    const rest = d.slice(1);
    return isValidZmSubscriber(rest) ? `+${countryCode}${rest}` : '';
  }
  // Bare subscriber number, no trunk prefix
  if (isValidZmSubscriber(d)) return `+${countryCode}${d}`;

  // Not Zambian — accept a plausible international number as-is rather than
  // discarding it. Sellers and buyers abroad are rare but real.
  if (d.length >= 8 && d.length <= 15) return `+${d}`;
  return '';
};

/**
 * Zambian national numbers are nine digits after the country code, across
 * every range — mobile and geographic alike.
 *
 * Length only, deliberately no prefix allow-list. The previous version listed
 * 95/96/97/75/76/77 and silently rejected everything else, which was already
 * wrong: ZICTA added 055, 056 and 057 in December 2024, 98 belongs to Beeline,
 * and mobile ranges now span 50-59, 70-79 and 91-99. An allow-list has to be
 * edited every time the regulator allocates a range, and until someone
 * notices, real customers cannot save their own number.
 *
 * The trade-off is accepting some numbers that aren't allocated yet. That's
 * the right way round: a validator can't catch a mistyped digit anyway, and
 * turning away a valid customer is far worse than accepting a typo the user
 * can see and correct.
 */
const isValidZmSubscriber = (rest) => /^\d{9}$/.test(rest);

/** Human-readable form: +260 97 712 3456 */
export const formatPhone = (e164) => {
  if (!e164) return '';
  const d = e164.replace(/\D/g, '');
  if (d.startsWith(ZM_CC) && d.length === 12) {
    const s = d.slice(3);
    return `+${ZM_CC} ${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5)}`;
  }
  return e164;
};

/** True when a number is usable for a WhatsApp link. */
export const isReachable = (phone) => Boolean(normalizePhone(phone));

/**
 * Build a wa.me link.
 *
 * wa.me wants digits only — no plus, no spaces — and a URL-encoded prefill.
 * This is the free path: no Cloud API, no templates, no per-message cost. It
 * can't send notifications (only the customer can open a conversation), but
 * it's how people in this market actually expect to reach a shop.
 */
export const whatsappLink = (phone, message = '') => {
  const e164 = normalizePhone(phone);
  if (!e164) return '';
  const digits = e164.replace(/\D/g, '');
  const q = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${q}`;
};
