import { nanoid } from 'nanoid';
import * as db from '../lib/db.js';

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

/** @deprecated */
export const generateFranchiseCode = generateAgencyCode;

export function generateLeadId() {
  const year = new Date().getFullYear();
  return `DM-${year}-${nanoid(6).toUpperCase()}`;
}

export async function notifyUser(userId, { title, message, type = 'system', link = '', meta = {} }) {
  try {
    db.createNotification({ userId, title, message, type, link, meta });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

export function partnerTypeLabel(type) {
  const labels = {
    referral_partner: 'Referral Partner',
    teacher: 'Teacher',
    school: 'School',
    college: 'College',
    coaching_center: 'Coaching Center',
    influencer: 'Influencer',
    counsellor: 'Counsellor',
    agency: 'Agency Partner',
    franchise: 'Agency Partner',
  };
  return labels[type] || type || 'Partner';
}

export function statusLabel(status) {
  const labels = {
    new: 'New', contacted: 'Contacted', interested: 'Interested',
    counselling_scheduled: 'Counselling Scheduled', assessment_done: 'Assessment Done',
    converted: 'Converted', lost: 'Lost', on_hold: 'On Hold',
  };
  return labels[status] || status;
}
