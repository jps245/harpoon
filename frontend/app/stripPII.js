/**
 * stripPII.js
 * Removes personally identifiable information from document text
 * before sending to an external API. Designed for hospital bills
 * and similar financial/medical documents.
 *
 * Usage:
 *   import { stripPII } from './stripPII.js';
 *   const cleanText = stripPII(rawText);
 */

const PII_PATTERNS = [
  // Social Security Number — formats: 123-45-6789, 123 45 6789, 123456789
  { label: 'SSN',             regex: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b|\b\d{9}\b(?=\s|$)/g },

  // Medicare / Medicaid ID — typically 11-char alphanumeric
  { label: 'MEDICARE_ID',     regex: /\b[A-Z0-9]{4}[-\s]?[A-Z0-9]{3}[-\s]?[A-Z0-9]{4}\b/g },

  // Insurance member / policy ID — alphanumeric, 8–15 chars, often prefixed
  { label: 'INSURANCE_ID',    regex: /\b(?:Member|Policy|Group|Subscriber)\s*(?:#|No\.?|ID)?\s*[A-Z0-9]{6,15}\b/gi },

  // Account / patient / claim number — labeled patterns only (avoids stripping all numbers)
  { label: 'ACCOUNT_NUM',     regex: /\b(?:Account|Patient|Acct|Claim|Invoice|Bill)\s*(?:#|No\.?|Number|Num)?\s*[A-Z0-9\-]{4,20}\b/gi },

  // Date of birth — formats: 01/15/1985, 01-15-1985, Jan 15 1985, January 15, 1985
  { label: 'DOB',             regex: /\b(?:DOB|Date of Birth|Birthdate|Birth Date)[:\s]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi },
  { label: 'DOB_ALPHA',       regex: /\b(?:DOB|Date of Birth)[:\s]*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi },

  // Standalone dates in MM/DD/YYYY or MM-DD-YYYY (conservative — only removes when 4-digit year present)
  { label: 'DATE',            regex: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g },

  // Phone numbers — formats: (612) 555-1234, 612-555-1234, 612.555.1234, +1 612 555 1234
  { label: 'PHONE',           regex: /(?:\+1[\s\-]?)?\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4}\b/g },

  // Email addresses
  { label: 'EMAIL',           regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g },

  // US street address — number + street name + suffix (St, Ave, Rd, Blvd, Dr, Ln, Ct, Way, Pl)
  { label: 'ADDRESS',         regex: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl|Parkway|Pkwy)\.?\b/gi },

  // ZIP code — 5-digit or ZIP+4
  { label: 'ZIP',             regex: /\b\d{5}(?:-\d{4})?\b/g },

  // Full name — labeled patterns (avoids stripping drug/procedure names)
  { label: 'PATIENT_NAME',    regex: /\b(?:Patient|Name|Guarantor|Insured|Subscriber)[:\s]+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+\b/gi },

  // Credit card numbers — 16-digit with optional separators
  { label: 'CREDIT_CARD',     regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },

  // NPI (National Provider Identifier) — 10-digit, often labeled
  { label: 'NPI',             regex: /\b(?:NPI)[:\s#]*\d{10}\b/gi },
];

/**
 * Replaces each PII match with a placeholder token: [REDACTED_TYPE]
 * Preserves all billing codes, amounts, dates of service, and
 * medical terminology that are relevant for dispute analysis.
 *
 * @param {string} text - Raw extracted text from the document
 * @returns {string} - Cleaned text safe for API submission
 */
export function stripPII(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  for (const { label, regex } of PII_PATTERNS) {
    cleaned = cleaned.replace(regex, `[REDACTED_${label}]`);
  }

  return cleaned;
}

/**
 * Returns a summary of what was redacted — useful for logging
 * or displaying a "we removed X fields" message to the user.
 *
 * @param {string} originalText
 * @returns {{ cleanedText: string, redactionSummary: Record<string, number> }}
 */
export function stripPIIWithSummary(text) {
  if (!text || typeof text !== 'string') {
    return { cleanedText: '', redactionSummary: {} };
  }

  let cleaned = text;
  const summary = {};

  for (const { label, regex } of PII_PATTERNS) {
    const matches = cleaned.match(regex);
    if (matches && matches.length > 0) {
      summary[label] = matches.length;
      cleaned = cleaned.replace(regex, `[REDACTED_${label}]`);
    }
  }

  return { cleanedText: cleaned, redactionSummary: summary };
}
