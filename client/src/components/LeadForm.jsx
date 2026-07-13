import { useState } from 'react';
import { INTEREST_OPTIONS, INDIAN_STATES, GENDER_OPTIONS, BUDGET_OPTIONS, CONTACT_TIME_OPTIONS } from '../utils/constants';
import { LEAD_TYPES, BUSINESS_TYPES } from '../config/adminTabs';
import { fieldEnabled, fieldLabel, fieldRequired } from '../utils/formTemplate';

export default function LeadForm({
  form,
  onChange,
  onSubmit,
  loading,
  submitLabel = 'Submit Lead',
  templateFields,
  showTypeSelector = true,
  quick = false,
}) {
  const [expanded, setExpanded] = useState(!quick);
  const update = (key, val) => onChange({ ...form, [key]: val });
  const show = (key) => fieldEnabled(templateFields, key);
  const lbl = (key, fallback) => fieldLabel(templateFields, key, fallback);
  const req = (key, fallback) => fieldRequired(templateFields, key, fallback);
  const isBusiness = form.leadType === 'business';
  const showFull = !quick || expanded;

  const toggleInterest = (item) => {
    const list = form.interestedIn || [];
    update('interestedIn', list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {showTypeSelector && (
        <div>
          <label className="dm-label">Lead Type</label>
          <div className="flex flex-wrap gap-2">
            {LEAD_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onChange({ ...form, leadType: t.value })}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  (form.leadType || 'student') === t.value
                    ? t.value === 'business'
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                {t.short || t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {quick && !expanded && isBusiness && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="dm-label">Company Name *</label>
            <input className="dm-input" value={form.companyName || ''} onChange={(e) => update('companyName', e.target.value)} required />
          </div>
          <div>
            <label className="dm-label">Contact Person *</label>
            <input className="dm-input" value={form.contactPerson || ''} onChange={(e) => update('contactPerson', e.target.value)} required />
          </div>
          <div>
            <label className="dm-label">Phone *</label>
            <input className="dm-input" value={form.contactPhone || ''} onChange={(e) => update('contactPhone', e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label className="dm-label">Notes</label>
            <textarea className="dm-input min-h-[60px]" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} placeholder="Any details for the sales team..." />
          </div>
        </div>
      )}

      {quick && !expanded && !isBusiness && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="dm-label">Student Name *</label>
            <input className="dm-input" value={form.studentName || ''} onChange={(e) => update('studentName', e.target.value)} required />
          </div>
          <div>
            <label className="dm-label">Phone *</label>
            <input className="dm-input" value={form.studentPhone || ''} onChange={(e) => update('studentPhone', e.target.value)} required />
          </div>
          <div>
            <label className="dm-label">City</label>
            <input className="dm-input" value={form.city || ''} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div>
            <label className="dm-label">Class / Grade</label>
            <input className="dm-input" placeholder="e.g. Class 10" value={form.classGrade || ''} onChange={(e) => update('classGrade', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="dm-label">Notes</label>
            <textarea className="dm-input min-h-[60px]" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} placeholder="Interested in, parent info, etc." />
          </div>
        </div>
      )}

      {quick && !expanded && (
        <button type="button" className="text-sm font-medium text-gold-dark hover:underline" onClick={() => setExpanded(true)}>
          + Add more details (email, parent, budget...)
        </button>
      )}

      {showFull && isBusiness ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="dm-label">Company / Organization *</label>
            <input className="dm-input" value={form.companyName || ''} onChange={(e) => update('companyName', e.target.value)} required />
          </div>
          <div>
            <label className="dm-label">Business Type</label>
            <select className="dm-input" value={form.businessType || ''} onChange={(e) => update('businessType', e.target.value)}>
              <option value="">Select type</option>
              {BUSINESS_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="dm-label">Contact Person *</label>
            <input className="dm-input" value={form.contactPerson || ''} onChange={(e) => update('contactPerson', e.target.value)} required />
          </div>
          <div>
            <label className="dm-label">Contact Phone *</label>
            <input className="dm-input" value={form.contactPhone || ''} onChange={(e) => update('contactPhone', e.target.value)} required />
          </div>
          <div>
            <label className="dm-label">Contact Email</label>
            <input type="email" className="dm-input" value={form.contactEmail || ''} onChange={(e) => update('contactEmail', e.target.value)} />
          </div>
          <div>
            <label className="dm-label">Est. Students / Seats</label>
            <input type="number" min={0} className="dm-input" value={form.estimatedStudents || ''} onChange={(e) => update('estimatedStudents', e.target.value)} />
          </div>
          <div>
            <label className="dm-label">Deal Value (₹)</label>
            <input type="number" min={0} className="dm-input" value={form.dealValue || ''} onChange={(e) => update('dealValue', e.target.value)} />
          </div>
          <div>
            <label className="dm-label">City</label>
            <input className="dm-input" value={form.city || ''} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div>
            <label className="dm-label">State</label>
            <select className="dm-input" value={form.state || ''} onChange={(e) => update('state', e.target.value)}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="dm-label">Priority</label>
            <select className="dm-input" value={form.priority || 'medium'} onChange={(e) => update('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      ) : showFull ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {show('studentName') && (
            <div>
              <label className="dm-label">{lbl('studentName', 'Student Name')}{req('studentName', true) ? ' *' : ''}</label>
              <input className="dm-input" value={form.studentName || ''} onChange={(e) => update('studentName', e.target.value)} required={req('studentName', true)} />
            </div>
          )}
          {show('studentPhone') && (
            <div>
              <label className="dm-label">{lbl('studentPhone', 'Student Phone')}{req('studentPhone', true) ? ' *' : ''}</label>
              <input className="dm-input" value={form.studentPhone || ''} onChange={(e) => update('studentPhone', e.target.value)} required={req('studentPhone', true)} />
            </div>
          )}
          {show('studentEmail') && (
            <div>
              <label className="dm-label">{lbl('studentEmail', 'Student Email')}</label>
              <input type="email" className="dm-input" value={form.studentEmail || ''} onChange={(e) => update('studentEmail', e.target.value)} />
            </div>
          )}
          {show('classGrade') && (
            <div>
              <label className="dm-label">{lbl('classGrade', 'Class / Grade')}</label>
              <input className="dm-input" placeholder="e.g. Class 10" value={form.classGrade || ''} onChange={(e) => update('classGrade', e.target.value)} />
            </div>
          )}
          {show('parentName') && (
            <div>
              <label className="dm-label">{lbl('parentName', 'Parent Name')}</label>
              <input className="dm-input" value={form.parentName || ''} onChange={(e) => update('parentName', e.target.value)} />
            </div>
          )}
          {show('parentPhone') && (
            <div>
              <label className="dm-label">{lbl('parentPhone', 'Parent Phone')}</label>
              <input className="dm-input" value={form.parentPhone || ''} onChange={(e) => update('parentPhone', e.target.value)} />
            </div>
          )}
          {show('stream') && (
            <div>
              <label className="dm-label">{lbl('stream', 'Stream')}</label>
              <input className="dm-input" value={form.stream || ''} onChange={(e) => update('stream', e.target.value)} />
            </div>
          )}
          {show('schoolCollege') && (
            <div>
              <label className="dm-label">{lbl('schoolCollege', 'School / College')}</label>
              <input className="dm-input" value={form.schoolCollege || ''} onChange={(e) => update('schoolCollege', e.target.value)} />
            </div>
          )}
          {show('city') && (
            <div>
              <label className="dm-label">{lbl('city', 'City')}</label>
              <input className="dm-input" value={form.city || ''} onChange={(e) => update('city', e.target.value)} />
            </div>
          )}
          {show('state') && (
            <div>
              <label className="dm-label">{lbl('state', 'State')}</label>
              <select className="dm-input" value={form.state || ''} onChange={(e) => update('state', e.target.value)}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {show('pincode') && (
            <div>
              <label className="dm-label">{lbl('pincode', 'Pincode')}</label>
              <input className="dm-input" value={form.pincode || ''} onChange={(e) => update('pincode', e.target.value)} />
            </div>
          )}
          {show('gender') && (
            <div>
              <label className="dm-label">{lbl('gender', 'Gender')}</label>
              <select className="dm-input" value={form.gender || ''} onChange={(e) => update('gender', e.target.value)}>
                <option value="">Select</option>
                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}
          {show('dateOfBirth') && (
            <div>
              <label className="dm-label">{lbl('dateOfBirth', 'Date of Birth')}</label>
              <input type="date" className="dm-input" value={form.dateOfBirth || ''} onChange={(e) => update('dateOfBirth', e.target.value)} />
            </div>
          )}
          {show('budget') && (
            <div>
              <label className="dm-label">{lbl('budget', 'Budget Range')}</label>
              <select className="dm-input" value={form.budget || ''} onChange={(e) => update('budget', e.target.value)}>
                <option value="">Select</option>
                {BUDGET_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
          {show('preferredContactTime') && (
            <div>
              <label className="dm-label">{lbl('preferredContactTime', 'Preferred Contact Time')}</label>
              <select className="dm-input" value={form.preferredContactTime || ''} onChange={(e) => update('preferredContactTime', e.target.value)}>
                <option value="">Select</option>
                {CONTACT_TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
          {show('priority') && (
            <div>
              <label className="dm-label">{lbl('priority', 'Priority')}</label>
              <select className="dm-input" value={form.priority || 'medium'} onChange={(e) => update('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          )}
        </div>
      ) : null}

      {showFull && !isBusiness && show('whatsappOptIn') && (
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={form.whatsappOptIn !== false} onChange={(e) => update('whatsappOptIn', e.target.checked)} className="rounded border-stone-300 text-orange" />
          {lbl('whatsappOptIn', 'Student/parent agrees to WhatsApp communication')}
        </label>
      )}

      {showFull && show('interestedIn') && (
        <div>
          <label className="dm-label">{lbl('interestedIn', 'Interested In')}</label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((item) => (
              <button key={item} type="button" onClick={() => toggleInterest(item)} className={`rounded-full border px-3 py-1 text-xs font-medium ${(form.interestedIn || []).includes(item) ? 'border-orange/50 bg-orange/10 text-orange' : 'border-stone-200 text-stone-500'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {showFull && show('notes') && (
        <div>
          <label className="dm-label">{lbl('notes', 'Notes')}</label>
          <textarea className="dm-input min-h-[80px]" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} />
        </div>
      )}

      <button type="submit" disabled={loading} className="dm-btn-primary w-full sm:w-auto">{submitLabel}</button>
    </form>
  );
}

export const emptyLeadForm = {
  leadType: 'student',
  studentName: '', studentPhone: '', studentEmail: '', parentName: '', parentPhone: '',
  classGrade: '', stream: '', city: '', state: '', pincode: '', schoolCollege: '',
  companyName: '', contactPerson: '', contactPhone: '', contactEmail: '',
  businessType: '', estimatedStudents: '', dealValue: '',
  interestedIn: [], notes: '', priority: 'medium', gender: '', dateOfBirth: '',
  budget: '', preferredContactTime: '', whatsappOptIn: true,
};
