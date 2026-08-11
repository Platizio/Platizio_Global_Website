// The consent statement, in one place, as text.
//
// Privacy Policy §6 commits that where the DPDP Act 2023 requires consent, it
// will be "free, specific, informed, unconditional, unambiguous and based on
// clear affirmative action". Recording `consentGiven: true` evidences none of
// that — it cannot show what the person was told or which policy they were told
// it under.
//
// So the sentence rendered beside the checkbox and the sentence stored in
// consent_records are the same string, and it is sent verbatim with every
// submission alongside the policy version it referred to. If the wording or the
// policy changes, consents already collected keep saying what they said.
//
// The sentence is split into three because the rendered version has a link in
// the middle of it and the stored version cannot have one. Composing the stored
// text from the same three pieces the form renders means the two cannot drift
// apart — which a comment asking two files to stay in step would not achieve.

/** The Effective Date printed at the top of /privacy. */
export const POLICY_VERSION = '2026-05-11'

export const POLICY_URL = 'https://platizioglobal.com/privacy'

export const CONSENT_BEFORE_LINK =
  'I consent to Platizio Global using the details above to respond to my request, in line with the '
export const CONSENT_LINK_LABEL = 'Privacy Policy'
export const CONSENT_AFTER_LINK = '.'

/** Exactly what the customer read, as plain text. This is what gets stored. */
export const CONSENT_TEXT = CONSENT_BEFORE_LINK + CONSENT_LINK_LABEL + CONSENT_AFTER_LINK

// The contact modal collects the same categories of personal data — name,
// email, phone — for a different purpose, so it needs its own sentence rather
// than a reused one. "Specific" in Privacy Policy §6 means specific to the
// purpose; consent to being answered about a support ticket is not consent to
// being contacted about a product enquiry.
export const ENQUIRY_CONSENT_BEFORE_LINK =
  'I consent to Platizio Global using the details above to contact me about this enquiry, in line with the '
export const ENQUIRY_CONSENT_TEXT =
  ENQUIRY_CONSENT_BEFORE_LINK + CONSENT_LINK_LABEL + CONSENT_AFTER_LINK

export interface ConsentRecord {
  text: string
  version: string
  url: string
}

export const consentRecord = (): ConsentRecord => ({
  text: CONSENT_TEXT,
  version: POLICY_VERSION,
  url: POLICY_URL,
})
