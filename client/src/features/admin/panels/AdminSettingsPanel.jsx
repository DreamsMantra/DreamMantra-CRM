import { Send } from 'lucide-react';
import DashboardSection from '../../../components/layout/DashboardSection';
import SectionBlock from '../../../components/layout/SectionBlock';
import ProductsPricing from '../../../components/admin/ProductsPricing';
import { ADMIN_SUB_TABS } from '../../../config/adminTabs';
import { SETTINGS_FIELDS } from '../constants';
import { api } from '../../../api';

export default function AdminSettingsPanel({
  pageInfo, innerSub, setInner, settings, setSettings, notifyForm, setNotifyForm, flash,
}) {
  return (
    <DashboardSection
      title={pageInfo.title}
      description={pageInfo.desc}
      subTabs={ADMIN_SUB_TABS.settings}
      activeSub={innerSub}
      onSubChange={setInner}
    >
      {(innerSub === 'general' || !innerSub) && (
        <div className="space-y-6">
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
              <button type="submit" className="dm-btn-primary flex w-full items-center justify-center gap-2"><Send className="h-4 w-4" /> Send</button>
            </form>
          </SectionBlock>
        </div>
      )}
      {innerSub === 'pricing' && (
        <div className="space-y-6">
          <ProductsPricing embedded />
        </div>
      )}
    </DashboardSection>
  );
}
