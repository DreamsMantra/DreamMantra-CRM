import { nanoid } from 'nanoid';

const LOGIN_ID_PREFIX = {
  referral_partner: 'REF',
  teacher: 'TCH',
  school: 'SCH',
  college: 'COL',
  coaching_center: 'CCH',
  influencer: 'INF',
  counsellor: 'CNS',
  agency: 'AGY',
  franchise: 'AGY',
};

export function generateReferralCode(name = 'DM') {
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'DM';
  return `${prefix}${nanoid(6).toUpperCase()}`;
}

export function generateLoginId(partnerType = 'referral_partner') {
  const prefix = LOGIN_ID_PREFIX[partnerType] || 'PTR';
  return `${prefix}-${nanoid(6).toUpperCase()}`;
}

export function normalizeLoginId(value) {
  return (value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidLoginId(value) {
  return /^[A-Z0-9][A-Z0-9_-]{3,19}$/.test(normalizeLoginId(value));
}

export function generateAgencyCode(territory = 'DM') {
  const prefix = (territory || 'DM').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'DM';
  return `AGY-${prefix}${nanoid(5).toUpperCase()}`;
}

/** Random Lead ID: s783936 (student/B2C) or p740870 (business/B2B). Unique checked by callers. */
export function generateLeadId(leadType = 'student') {
  const prefix = leadType === 'business' ? 'p' : 's';
  const digits = String(Math.floor(100000 + Math.random() * 900000));
  return `${prefix}${digits}`;
}
