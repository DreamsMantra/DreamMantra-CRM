import * as db from '../lib/db.js';
export {
  generateReferralCode,
  generateLoginId,
  normalizeLoginId,
  isValidLoginId,
  generateAgencyCode,
  generateLeadId,
} from './ids.js';

/** @deprecated */
export { generateAgencyCode as generateFranchiseCode } from './ids.js';

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
