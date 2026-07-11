import { INTEREST_OPTIONS, INDIAN_STATES, GENDER_OPTIONS, BUDGET_OPTIONS, CONTACT_TIME_OPTIONS } from '../utils/constants';

export default function LeadForm({ form, onChange, onSubmit, loading, submitLabel = 'Submit Lead' }) {
  const update = (key, val) => onChange({ ...form, [key]: val });

  const toggleInterest = (item) => {
    const list = form.interestedIn || [];
    update(
      'interestedIn',
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="dm-label">Student Name *</label>
          <input className="dm-input" value={form.studentName} onChange={(e) => update('studentName', e.target.value)} required />
        </div>
        <div>
          <label className="dm-label">Student Phone *</label>
          <input className="dm-input" value={form.studentPhone} onChange={(e) => update('studentPhone', e.target.value)} required />
        </div>
        <div>
          <label className="dm-label">Student Email</label>
          <input type="email" className="dm-input" value={form.studentEmail} onChange={(e) => update('studentEmail', e.target.value)} />
        </div>
        <div>
          <label className="dm-label">Class / Grade</label>
          <input className="dm-input" placeholder="e.g. Class 10, B.Tech 2nd Year" value={form.classGrade} onChange={(e) => update('classGrade', e.target.value)} />
        </div>
        <div>
          <label className="dm-label">Parent Name</label>
          <input className="dm-input" value={form.parentName} onChange={(e) => update('parentName', e.target.value)} />
        </div>
        <div>
          <label className="dm-label">Parent Phone</label>
          <input className="dm-input" value={form.parentPhone} onChange={(e) => update('parentPhone', e.target.value)} />
        </div>
        <div>
          <label className="dm-label">Stream</label>
          <input className="dm-input" placeholder="Science / Commerce / Arts" value={form.stream} onChange={(e) => update('stream', e.target.value)} />
        </div>
        <div>
          <label className="dm-label">School / College</label>
          <input className="dm-input" value={form.schoolCollege} onChange={(e) => update('schoolCollege', e.target.value)} />
        </div>
        <div>
          <label className="dm-label">City</label>
          <input className="dm-input" value={form.city} onChange={(e) => update('city', e.target.value)} />
        </div>
        <div>
          <label className="dm-label">State</label>
          <select className="dm-input" value={form.state} onChange={(e) => update('state', e.target.value)}>
            <option value="" className="bg-green-card">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s} className="bg-green-card">{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="dm-label">Pincode</label>
          <input className="dm-input" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} />
        </div>
        <div>
          <label className="dm-label">Gender</label>
          <select className="dm-input" value={form.gender} onChange={(e) => update('gender', e.target.value)}>
            <option value="">Select</option>
            {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="dm-label">Date of Birth</label>
          <input type="date" className="dm-input" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
        </div>
        <div>
          <label className="dm-label">Budget Range</label>
          <select className="dm-input" value={form.budget} onChange={(e) => update('budget', e.target.value)}>
            <option value="">Select</option>
            {BUDGET_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="dm-label">Preferred Contact Time</label>
          <select className="dm-input" value={form.preferredContactTime} onChange={(e) => update('preferredContactTime', e.target.value)}>
            <option value="">Select</option>
            {CONTACT_TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="dm-label">Priority</label>
          <select className="dm-input" value={form.priority} onChange={(e) => update('priority', e.target.value)}>
            <option value="low" className="bg-green-card">Low</option>
            <option value="medium" className="bg-green-card">Medium</option>
            <option value="high" className="bg-green-card">High</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={form.whatsappOptIn} onChange={(e) => update('whatsappOptIn', e.target.checked)} className="rounded border-stone-300 text-orange focus:ring-orange" />
        Student/parent agrees to WhatsApp communication
      </label>

      <div>
        <label className="dm-label">Interested In</label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleInterest(item)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                (form.interestedIn || []).includes(item)
                  ? 'border-orange/50 bg-orange/10 text-orange'
                  : 'border-stone-200 text-stone-500 hover:border-gold/40'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="dm-label">Notes</label>
        <textarea
          className="dm-input min-h-[80px]"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Any additional info about the student..."
        />
      </div>

      <button type="submit" disabled={loading} className="dm-btn-primary w-full sm:w-auto">
        {submitLabel}
      </button>
    </form>
  );
}

export const emptyLeadForm = {
  studentName: '',
  studentPhone: '',
  studentEmail: '',
  parentName: '',
  parentPhone: '',
  classGrade: '',
  stream: '',
  city: '',
  state: '',
  pincode: '',
  schoolCollege: '',
  interestedIn: [],
  notes: '',
  priority: 'medium',
  gender: '',
  dateOfBirth: '',
  budget: '',
  preferredContactTime: '',
  whatsappOptIn: true,
};
