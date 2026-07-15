import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import LeadForm from '../../components/LeadForm';
import LeadComments from '../../components/LeadComments';
import CredentialsModal from '../../components/CredentialsModal';
import { PartnerDetailModal } from '../../components/admin/AdminTools';
import { PARTNER_TYPES, PARTNER_TIERS, LEAD_STATUSES, AGENCY_INVESTMENT_TIERS, AGENCY_OPERATING_MODELS } from '../../utils/constants';
import { leadDisplayName, leadDisplayPhone } from '../../config/adminTabs';
import JourneyTimeline from '../../components/JourneyTimeline';
import { suggestLoginId } from './constants';
import { api } from '../../api';

function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '').slice(-10);
}

export default function AdminModals({
  viewPartner,
  setViewPartner,
  partnerDetail,
  setPartnerDetail,
  savePartnerFromDetail,
  credentialsData,
  setCredentialsData,
  partnerModal,
  setPartnerModal,
  editingPartner,
  partnerForm,
  setPartnerForm,
  fail,
  flash,
  load,
  selectedLead,
  setSelectedLead,
  leadUpdate,
  setLeadUpdate,
  leadEditForm,
  setLeadEditForm,
  leadTemplateFields,
  transferPartnerId,
  setTransferPartnerId,
  partners,
  openLeadDetail,
  deleteLead,
  leadComments,
  leadModal,
  setLeadModal,
  adminLeadForm,
  setAdminLeadForm,
  commissionModal,
  setCommissionModal,
  commissionForm,
  setCommissionForm,
  leads,
  editCommission,
  setEditCommission,
}) {
  const [adminDupWarn, setAdminDupWarn] = useState(null);

  const findLocalPhoneDupes = (form) => {
    const phone = normalizePhone(form.leadType === 'business' ? form.contactPhone : form.studentPhone);
    if (phone.length < 10) return [];
    return (leads || []).filter((l) => {
      const lp = normalizePhone(leadDisplayPhone(l) === '—' ? (l.studentPhone || l.contactPhone) : leadDisplayPhone(l));
      return lp && lp === phone;
    });
  };

  const handleAdminCreateLead = async (e) => {
    e.preventDefault();
    if (!adminLeadForm.partnerId) {
      fail(new Error('Select a partner'));
      return;
    }
    const dupes = findLocalPhoneDupes(adminLeadForm);
    const sameWarn = adminDupWarn?.length
      && dupes.length
      && adminDupWarn.map((d) => d.leadId).join() === dupes.map((d) => d.leadId).join();
    if (dupes.length && !sameWarn) {
      setAdminDupWarn(dupes);
      fail(new Error(`Possible duplicate phone — matches ${dupes.map((d) => d.leadId).join(', ')}. Submit again to create anyway.`));
      return;
    }
    try {
      await api.admin.createLead(adminLeadForm);
      setAdminDupWarn(null);
      setLeadModal(false);
      flash('Lead created');
      load();
    } catch (err) {
      if (err.data?.duplicates) setAdminDupWarn(err.data.duplicates);
      fail(err);
    }
  };
  return (
    <>
      {/* ─── MODALS ─── */}
      <PartnerDetailModal partner={viewPartner} detail={partnerDetail} open={false} onClose={() => { setViewPartner(null); setPartnerDetail(null); }} onSave={savePartnerFromDetail} />

      <CredentialsModal
        open={!!credentialsData}
        onClose={() => setCredentialsData(null)}
        credentials={credentialsData?.credentials}
        partnerName={credentialsData?.name}
      />

      <Modal open={partnerModal} onClose={() => setPartnerModal(false)} title={editingPartner ? 'Edit Partner' : 'Create Partner Account'} wide>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (editingPartner) {
              await api.admin.updatePartner(editingPartner.id, partnerForm);
              flash('Partner updated');
              setPartnerModal(false);
              load();
            } else {
              if (!partnerForm.password || partnerForm.password.length < 6) {
                fail(new Error('Password is required (min 6 characters)'));
                return;
              }
              const res = await api.admin.createPartner(partnerForm);
              setPartnerModal(false);
              setCredentialsData({ credentials: res.credentials, name: res.partner.name });
              flash('Partner account created — share credentials below');
              load();
            }
          } catch (err) { fail(err); }
        }} className="space-y-5">
          {!editingPartner && (
            <div className="rounded-xl border border-orange/20 bg-orange/5 p-4 text-sm text-stone-700">
              Create login credentials for the partner. They will sign in using <strong>Partner ID</strong> or email with the password you set.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {['name', 'email', 'phone', 'organization', 'city', 'state', 'address'].map((f) => (
              <div key={f}><label className="dm-label capitalize">{f}</label><input className="dm-input" value={partnerForm[f] || ''} onChange={(e) => setPartnerForm({ ...partnerForm, [f]: e.target.value })} required={['name', 'email'].includes(f) && !editingPartner} disabled={f === 'email' && !!editingPartner} /></div>
            ))}
            <div>
              <label className="dm-label">Partner ID (login)</label>
              <div className="flex gap-2">
                <input className="dm-input font-mono uppercase" value={partnerForm.loginId || ''} onChange={(e) => setPartnerForm({ ...partnerForm, loginId: e.target.value.toUpperCase() })} placeholder="TCH-ABC123" required={!editingPartner} />
                {!editingPartner && (
                  <button type="button" className="dm-btn-ghost shrink-0 text-xs" onClick={() => setPartnerForm({ ...partnerForm, loginId: suggestLoginId(partnerForm.partnerType) })}>Generate</button>
                )}
              </div>
            </div>
            {!editingPartner && (
              <div>
                <label className="dm-label">Password *</label>
                <input className="dm-input" type="text" value={partnerForm.password} onChange={(e) => setPartnerForm({ ...partnerForm, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} />
              </div>
            )}
            <div><label className="dm-label">Type</label><select className="dm-input" value={partnerForm.partnerType} onChange={(e) => {
              const type = e.target.value;
              setPartnerForm({
                ...partnerForm,
                partnerType: type,
                loginId: !editingPartner ? suggestLoginId(type) : partnerForm.loginId,
                ...(type === 'agency' ? { commissionRate: 15, tier: 'gold' } : {}),
              });
            }}>{PARTNER_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
            <div><label className="dm-label">Tier</label><select className="dm-input" value={partnerForm.tier} onChange={(e) => setPartnerForm({ ...partnerForm, tier: e.target.value })}>{PARTNER_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div className="sm:col-span-2 rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-xs text-amber-900">
              Commission is now <strong>per product</strong> on the partner profile (Products &amp; rates). Fixed % below is legacy fallback only.
            </div>
            <div><label className="dm-label">Legacy Commission % (fallback)</label><input type="number" className="dm-input" value={partnerForm.commissionRate} onChange={(e) => setPartnerForm({ ...partnerForm, commissionRate: Number(e.target.value) })} /></div>
            <div><label className="dm-label">Status</label><select className="dm-input" value={partnerForm.status} onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value })}>{['pending', 'active', 'suspended', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            {partnerForm.partnerType === 'agency' && (
              <>
                <div className="sm:col-span-2 rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm font-semibold text-gold-dark">Agency Details</div>
                <div><label className="dm-label">Agency Name</label><input className="dm-input" value={partnerForm.agencyName} onChange={(e) => setPartnerForm({ ...partnerForm, agencyName: e.target.value })} /></div>
                <div><label className="dm-label">Territory</label><input className="dm-input" value={partnerForm.territory} onChange={(e) => setPartnerForm({ ...partnerForm, territory: e.target.value })} /></div>
                <div><label className="dm-label">Centres</label><input type="number" min={1} className="dm-input" value={partnerForm.outletCount} onChange={(e) => setPartnerForm({ ...partnerForm, outletCount: Number(e.target.value) })} /></div>
                <div><label className="dm-label">Investment Tier</label><select className="dm-input" value={partnerForm.investmentTier} onChange={(e) => setPartnerForm({ ...partnerForm, investmentTier: e.target.value })}>{AGENCY_INVESTMENT_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div><label className="dm-label">Operating Model</label><select className="dm-input" value={partnerForm.operatingModel} onChange={(e) => setPartnerForm({ ...partnerForm, operatingModel: e.target.value })}>{AGENCY_OPERATING_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                <div><label className="dm-label">Agreement Date</label><input type="date" className="dm-input" value={partnerForm.agreementDate} onChange={(e) => setPartnerForm({ ...partnerForm, agreementDate: e.target.value })} /></div>
              </>
            )}
            <div className="sm:col-span-2"><label className="dm-label">Admin Notes</label><textarea className="dm-input" value={partnerForm.notes} onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })} /></div>
          </div>
          <button type="submit" className="dm-btn-primary w-full">{editingPartner ? 'Save Changes' : 'Create Partner & Get Credentials'}</button>
        </form>
      </Modal>

      <Modal open={!!selectedLead} onClose={() => setSelectedLead(null)} title={`Lead ID ${selectedLead?.leadId}`} wide>
        {selectedLead && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map((s) => (
                <button key={s.value} type="button" onClick={() => setLeadUpdate({ ...leadUpdate, status: s.value })} className={`rounded-lg px-3 py-1 text-xs font-medium ${leadUpdate.status === s.value ? 'bg-orange text-white' : 'bg-stone-100 text-stone-600'}`}>{s.label}</button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="dm-label">Follow-up</label><input type="date" className="dm-input" value={leadUpdate.followUpDate} onChange={(e) => setLeadUpdate({ ...leadUpdate, followUpDate: e.target.value })} /></div>
              <div><label className="dm-label">Priority</label><select className="dm-input" value={leadUpdate.priority} onChange={(e) => setLeadUpdate({ ...leadUpdate, priority: e.target.value })}>{['low','medium','high'].map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="dm-label">Expected Value ₹</label><input type="number" className="dm-input" value={leadUpdate.expectedValue} onChange={(e) => setLeadUpdate({ ...leadUpdate, expectedValue: Number(e.target.value) })} /></div>
              <div><label className="dm-label">Tags (comma)</label><input className="dm-input" value={leadUpdate.tags} onChange={(e) => setLeadUpdate({ ...leadUpdate, tags: e.target.value })} /></div>
            </div>
            <div><label className="dm-label">Status Note</label><input className="dm-input" value={leadUpdate.note} onChange={(e) => setLeadUpdate({ ...leadUpdate, note: e.target.value })} /></div>
            <div><label className="dm-label">Admin Notes (partner sees)</label><textarea className="dm-input" value={leadUpdate.adminNotes} onChange={(e) => setLeadUpdate({ ...leadUpdate, adminNotes: e.target.value })} /></div>

            <details className="rounded-xl border border-stone-200 p-4" open>
              <summary className="cursor-pointer font-semibold text-stone-800">Journey tracking</summary>
              <div className="mt-3">
                <JourneyTimeline lead={selectedLead} />
              </div>
            </details>

            <details className="rounded-xl border border-stone-200 p-4" open>
              <summary className="cursor-pointer font-semibold text-stone-800">Product rates for this lead</summary>
              <LeadProductRates lead={selectedLead} flash={flash} />
            </details>

            <details className="rounded-xl border border-stone-200 p-4" open>
              <summary className="cursor-pointer font-semibold text-stone-800">Edit Full Lead Details</summary>
              <div className="mt-4">
                <LeadForm
                  form={leadEditForm || {}}
                  onChange={setLeadEditForm}
                  templateFields={leadTemplateFields}
                  onSubmit={async (e) => { e.preventDefault(); await api.admin.editLead(selectedLead.id || selectedLead._id, leadEditForm); flash('Lead details saved'); load(); }}
                  submitLabel={leadEditForm?.leadType === 'business' ? 'Save Business Details' : 'Save Student Details'}
                />
              </div>
            </details>

            <details className="rounded-xl border border-stone-200 p-4">
              <summary className="cursor-pointer font-semibold text-stone-800">Transfer to Another Partner</summary>
              <div className="mt-4 flex gap-2">
                <select className="dm-input flex-1" value={transferPartnerId} onChange={(e) => setTransferPartnerId(e.target.value)}>
                  <option value="">Select partner</option>
                  {partners.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button type="button" disabled={!transferPartnerId} onClick={async () => { await api.admin.transferLead(selectedLead.id || selectedLead._id, transferPartnerId); flash('Transferred'); setSelectedLead(null); load(); }} className="dm-btn-primary">Transfer</button>
              </div>
            </details>

            <div className="flex gap-2">
              <button type="button" onClick={async () => { await api.admin.updateLead(selectedLead.id || selectedLead._id, { ...leadUpdate, tags: leadUpdate.tags ? leadUpdate.tags.split(',').map((t) => t.trim()) : [] }); flash('Updated'); setSelectedLead(null); load(); }} className="dm-btn-primary flex-1">Save All Changes</button>
              <button type="button" onClick={() => deleteLead(selectedLead)} className="dm-btn-danger">Delete</button>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <p className="mb-2 font-semibold">Comments</p>
              <LeadComments comments={leadComments} canAddInternal onAdd={(msg, internal) => api.admin.addComment(selectedLead.id || selectedLead._id, msg, internal).then(() => openLeadDetail(selectedLead))} />
            </div>
          </div>
        )}
      </Modal>

      <Modal open={leadModal} onClose={() => { setLeadModal(false); setAdminDupWarn(null); }} title="Add Lead" wide>
        {adminDupWarn?.length > 0 && (
          <div className="mb-4 rounded-xl border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold text-amber-900">Possible duplicate phone</p>
            <p className="mt-1 text-amber-800">
              {adminDupWarn.map((d) => `${leadDisplayName(d) || d.studentName} (${d.leadId})`).join(', ')}
            </p>
          </div>
        )}
        <select className="dm-input mb-4" value={adminLeadForm.partnerId} onChange={(e) => setAdminLeadForm({ ...adminLeadForm, partnerId: e.target.value })} required>
          <option value="">Select partner *</option>
          {partners.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <LeadForm
          quick
          form={adminLeadForm}
          onChange={(f) => { setAdminLeadForm(f); setAdminDupWarn(null); }}
          templateFields={leadTemplateFields}
          submitLabel="Create Lead"
          onSubmit={handleAdminCreateLead}
        />
      </Modal>

      <Modal open={commissionModal} onClose={() => setCommissionModal(false)} title="Add Manual Commission">
        <form onSubmit={async (e) => { e.preventDefault(); await api.admin.createCommission(commissionForm); setCommissionModal(false); flash('Commission added'); load(); }} className="space-y-4">
          <div><label className="dm-label">Partner</label><select className="dm-input" value={commissionForm.partnerId} onChange={(e) => setCommissionForm({ ...commissionForm, partnerId: e.target.value })} required>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="dm-label">Lead ID</label><select className="dm-input" value={commissionForm.leadId} onChange={(e) => setCommissionForm({ ...commissionForm, leadId: e.target.value })} required>{leads.map((l) => <option key={l.id || l._id} value={l.id || l._id}>{l.leadId} — {leadDisplayName(l)}</option>)}</select></div>
          <div><label className="dm-label">Amount ₹</label><input type="number" className="dm-input" value={commissionForm.amount} onChange={(e) => setCommissionForm({ ...commissionForm, amount: e.target.value })} required /></div>
          <div><label className="dm-label">Notes</label><input className="dm-input" value={commissionForm.notes} onChange={(e) => setCommissionForm({ ...commissionForm, notes: e.target.value })} /></div>
          <button type="submit" className="dm-btn-primary w-full">Create Commission</button>
        </form>
      </Modal>
      <Modal open={!!editCommission} onClose={() => setEditCommission(null)} title="Edit Commission">
        {editCommission && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            await api.admin.updateCommission(editCommission.id, {
              amount: Number(editCommission.amount),
              status: editCommission.status,
              notes: editCommission.notes,
              paymentReference: editCommission.paymentReference,
            });
            flash('Commission updated');
            setEditCommission(null);
            load();
          }} className="space-y-4">
            <div><label className="dm-label">Amount ₹</label><input type="number" className="dm-input" value={editCommission.amount} onChange={(e) => setEditCommission({ ...editCommission, amount: e.target.value })} required /></div>
            <div><label className="dm-label">Status</label><select className="dm-input" value={editCommission.status} onChange={(e) => setEditCommission({ ...editCommission, status: e.target.value })}>{['pending', 'approved', 'paid', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="dm-label">Payment Reference</label><input className="dm-input" value={editCommission.paymentReference || ''} onChange={(e) => setEditCommission({ ...editCommission, paymentReference: e.target.value })} /></div>
            <div><label className="dm-label">Notes</label><textarea className="dm-input" value={editCommission.notes || ''} onChange={(e) => setEditCommission({ ...editCommission, notes: e.target.value })} /></div>
            <button type="submit" className="dm-btn-primary w-full">Save Commission</button>
          </form>
        )}
      </Modal>
    </>
  );
}

function LeadProductRates({ lead, flash }) {
  const [products, setProducts] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [drafts, setDrafts] = useState({});
  const leadId = lead?.id || lead?._id;

  useEffect(() => {
    if (!leadId) return;
    Promise.all([
      api.admin.products(),
      api.admin.productRateOverrides({ scope: 'lead', entityId: leadId }),
    ]).then(([p, o]) => {
      const list = p.products || [];
      setProducts(list);
      setOverrides(o.overrides || []);
      const d = {};
      list.forEach((prod) => {
        const ov = (o.overrides || []).find((x) => x.productId === prod.id);
        d[prod.id] = {
          salePrice: ov?.salePrice ?? prod.price,
          commissionType: ov?.commission?.type || prod.commission?.type || 'fixed',
          commissionValue: ov?.commission?.value ?? prod.commission?.value ?? 0,
        };
      });
      setDrafts(d);
    }).catch(() => {});
  }, [leadId]);

  const save = async (productId) => {
    const d = drafts[productId];
    await api.admin.upsertProductRateOverride({
      scope: 'lead',
      entityId: leadId,
      productId,
      salePrice: Number(d.salePrice),
      listPrice: Number(d.salePrice),
      commission: { type: d.commissionType, value: Number(d.commissionValue) },
    });
    flash?.('Lead product rate saved');
  };

  if (!products.length) return <p className="mt-2 text-sm text-stone-400">No products.</p>;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-stone-500">Override catalogue price/commission for this {lead?.leadType === 'business' ? 'potential partner' : 'potential student'}.</p>
      {products.map((prod) => {
        const d = drafts[prod.id] || {};
        const hasOv = overrides.some((o) => o.productId === prod.id);
        return (
          <div key={prod.id} className="grid gap-2 rounded-lg bg-stone-50 p-2 sm:grid-cols-5 sm:items-end">
            <div>
              <p className="text-sm font-medium">{prod.label}</p>
              <p className="text-[10px] text-stone-400">{hasOv ? 'Custom' : `Catalogue ₹${prod.price}`}</p>
            </div>
            <div>
              <label className="dm-label">Sale ₹</label>
              <input type="number" className="dm-input" value={d.salePrice ?? ''} onChange={(e) => setDrafts({ ...drafts, [prod.id]: { ...d, salePrice: e.target.value } })} />
            </div>
            <div>
              <label className="dm-label">Type</label>
              <select className="dm-input" value={d.commissionType || 'fixed'} onChange={(e) => setDrafts({ ...drafts, [prod.id]: { ...d, commissionType: e.target.value } })}>
                <option value="fixed">Fixed</option>
                <option value="percentage">%</option>
              </select>
            </div>
            <div>
              <label className="dm-label">Value</label>
              <input type="number" className="dm-input" value={d.commissionValue ?? ''} onChange={(e) => setDrafts({ ...drafts, [prod.id]: { ...d, commissionValue: e.target.value } })} />
            </div>
            <button type="button" className="dm-btn-ghost text-xs" onClick={() => save(prod.id)}>Save</button>
          </div>
        );
      })}
    </div>
  );
}
