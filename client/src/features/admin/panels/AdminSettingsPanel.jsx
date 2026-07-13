import { Send } from 'lucide-react';
import DashboardSection from '../../../components/layout/DashboardSection';
import SectionBlock from '../../../components/layout/SectionBlock';
import ProductsPricing from '../../../components/admin/ProductsPricing';
import MasterControl from '../../../components/admin/MasterControl';
import BulkLeadImport from '../../../components/BulkLeadImport';
import ExportButton from '../../../components/ExportButton';
import AutomationRules from '../../../components/admin/AutomationRules';
import AuditLog from '../../../components/admin/AuditLog';
import { ADMIN_SUB_TABS } from '../../../config/adminTabs';
import { SETTINGS_FIELDS } from '../constants';
import { api } from '../../../api';

export default function AdminSettingsPanel({
  pageInfo, innerSub, setInner, settings, setSettings, notifyForm, setNotifyForm,
  token, load, flash, fail, partners, leads, openLeadDetail, bulkImportPartner, setBulkImportPartner,
}) {
  return (
    <DashboardSection
      title={pageInfo.title}
      description={pageInfo.desc}
      subTabs={ADMIN_SUB_TABS.settings}
      activeSub={innerSub}
      onSubChange={setInner}
    >
      {innerSub === 'general' && (
        <div className="space-y-6">
          <ProductsPricing embedded />
          <SectionBlock title="CRM Settings">
            <form onSubmit={async (e) => { e.preventDefault(); await api.admin.updateSettings(settings); flash('Settings saved'); }} className="mx-auto max-w-xl space-y-4">
              {SETTINGS_FIELDS.map(({ key, label, type }) => (
                <div key={key}>
                  <label className="dm-label">{label}</label>
                  {type === 'textarea' ? <textarea className="dm-input" value={settings[key] || ''} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
                    : type === 'checkbox' ? <label className="flex items-center gap-2"><input type="checkbox" checked={settings[key] === true || settings[key] === 'true'} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} /> Enabled</label>
                    : <input type={type} className="dm-input" value={settings[key] ?? ''} onChange={(e) => setSettings({ ...settings, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} />}
                </div>
              ))}
              <button type="submit" className="dm-btn-primary w-full">Save Settings</button>
            </form>
          </SectionBlock>
          <SectionBlock title="Notify Partners" description="Send in-app notification to partners">
            <form onSubmit={async (e) => { e.preventDefault(); const res = await api.admin.notify(notifyForm); flash(`Sent to ${res.sent} partner(s)`); setNotifyForm({ partnerId: 'all', title: '', message: '', link: '' }); }} className="mx-auto max-w-xl space-y-4">
              <div><label className="dm-label">Title</label><input className="dm-input" value={notifyForm.title} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} required /></div>
              <div><label className="dm-label">Message</label><textarea className="dm-input min-h-[80px]" value={notifyForm.message} onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })} required /></div>
              <button type="submit" className="dm-btn-primary w-full flex items-center justify-center gap-2"><Send className="h-4 w-4" /> Send</button>
            </form>
          </SectionBlock>
        </div>
      )}
      {innerSub === 'tools' && (
        <div className="space-y-6">
          <MasterControl token={token} onRefresh={load} flash={flash} fail={fail} partners={partners} leads={leads} onOpenLead={openLeadDetail} />
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionBlock title="Import Leads">
              <select className="dm-input mb-4" value={bulkImportPartner} onChange={(e) => setBulkImportPartner(e.target.value)}>
                <option value="">Select partner</option>
                {partners.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <BulkLeadImport onImport={async (leadsData) => { if (!bulkImportPartner) { fail(new Error('Select a partner')); return; } const res = await api.admin.bulkLeads(bulkImportPartner, leadsData); flash(`Imported ${res.created} leads`); load(); }} />
            </SectionBlock>
            <SectionBlock title="Export">
              <div className="space-y-3">
                <ExportButton href={api.admin.exportLeads()} token={token} label="Export Leads" />
                <ExportButton href={api.admin.exportPartners()} token={token} label="Export Partners" />
                <ExportButton href={api.admin.exportBackup()} token={token} label="Full Backup" />
              </div>
            </SectionBlock>
          </div>
          <AutomationRules embedded />
          <AuditLog embedded />
        </div>
      )}
    </DashboardSection>
  );
}
