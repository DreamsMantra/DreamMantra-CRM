export const DEFAULT_FORM_TEMPLATES = {
  registration: [
    { key: 'name', label: 'Full Name', type: 'text', required: true, enabled: true },
    { key: 'email', label: 'Email', type: 'email', required: true, enabled: true },
    { key: 'phone', label: 'Phone', type: 'tel', required: false, enabled: true },
    { key: 'password', label: 'Password', type: 'password', required: true, enabled: true },
    { key: 'partnerType', label: 'Partner Type', type: 'select', required: true, enabled: true },
    { key: 'organization', label: 'Organization', type: 'text', required: false, enabled: true },
    { key: 'city', label: 'City', type: 'text', required: false, enabled: true },
    { key: 'state', label: 'State', type: 'select', required: false, enabled: true },
    { key: 'address', label: 'Address', type: 'textarea', required: false, enabled: true },
    { key: 'franchiseName', label: 'Franchise Name', type: 'text', required: false, enabled: true, showWhen: 'franchise' },
    { key: 'territory', label: 'Territory', type: 'text', required: false, enabled: true, showWhen: 'franchise' },
    { key: 'outletCount', label: 'Planned Outlets', type: 'number', required: false, enabled: true, showWhen: 'franchise' },
    { key: 'investmentTier', label: 'Investment Tier', type: 'select', required: false, enabled: true, showWhen: 'franchise' },
    { key: 'operatingModel', label: 'Operating Model', type: 'select', required: false, enabled: true, showWhen: 'franchise' },
  ],
  lead: [
    { key: 'studentName', label: 'Student Name', type: 'text', required: true, enabled: true },
    { key: 'studentPhone', label: 'Student Phone', type: 'tel', required: true, enabled: true },
    { key: 'studentEmail', label: 'Student Email', type: 'email', required: false, enabled: true },
    { key: 'classGrade', label: 'Class / Grade', type: 'text', required: false, enabled: true },
    { key: 'parentName', label: 'Parent Name', type: 'text', required: false, enabled: true },
    { key: 'parentPhone', label: 'Parent Phone', type: 'tel', required: false, enabled: true },
    { key: 'stream', label: 'Stream', type: 'text', required: false, enabled: true },
    { key: 'schoolCollege', label: 'School / College', type: 'text', required: false, enabled: true },
    { key: 'city', label: 'City', type: 'text', required: false, enabled: true },
    { key: 'state', label: 'State', type: 'select', required: false, enabled: true },
    { key: 'pincode', label: 'Pincode', type: 'text', required: false, enabled: true },
    { key: 'gender', label: 'Gender', type: 'select', required: false, enabled: true },
    { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: false, enabled: true },
    { key: 'budget', label: 'Budget Range', type: 'select', required: false, enabled: true },
    { key: 'preferredContactTime', label: 'Preferred Contact Time', type: 'select', required: false, enabled: true },
    { key: 'whatsappOptIn', label: 'WhatsApp Opt-in', type: 'checkbox', required: false, enabled: true },
    { key: 'interestedIn', label: 'Interested In', type: 'multiselect', required: false, enabled: true },
    { key: 'notes', label: 'Notes', type: 'textarea', required: false, enabled: true },
    { key: 'priority', label: 'Priority', type: 'select', required: false, enabled: true },
  ],
  partnerProfile: [
    { key: 'name', label: 'Full Name', type: 'text', required: true, enabled: true },
    { key: 'phone', label: 'Phone', type: 'tel', required: false, enabled: true },
    { key: 'organization', label: 'Organization', type: 'text', required: false, enabled: true },
    { key: 'city', label: 'City', type: 'text', required: false, enabled: true },
    { key: 'state', label: 'State', type: 'select', required: false, enabled: true },
    { key: 'address', label: 'Address', type: 'textarea', required: false, enabled: true },
    { key: 'bankAccount', label: 'Bank Account', type: 'text', required: false, enabled: true },
    { key: 'ifsc', label: 'IFSC', type: 'text', required: false, enabled: true },
    { key: 'upiId', label: 'UPI ID', type: 'text', required: false, enabled: true },
    { key: 'panNumber', label: 'PAN Number', type: 'text', required: false, enabled: true },
  ],
};

export function getFormTemplates(settings = {}) {
  const stored = settings.formTemplates || {};
  const result = {};
  for (const [formId, defaults] of Object.entries(DEFAULT_FORM_TEMPLATES)) {
    const custom = stored[formId];
    if (!custom?.length) {
      result[formId] = defaults;
      continue;
    }
    const customMap = Object.fromEntries(custom.map((f) => [f.key, f]));
    result[formId] = defaults.map((d) => ({ ...d, ...customMap[d.key] }));
  }
  return result;
}

export function getEnabledFields(formId, settings = {}, context = {}) {
  const templates = getFormTemplates(settings);
  const fields = templates[formId] || [];
  return fields.filter((f) => {
    if (!f.enabled) return false;
    if (f.showWhen && context.partnerType !== f.showWhen) return false;
    return true;
  });
}
