import DashboardSection from '../../../components/layout/DashboardSection';
import SectionBlock from '../../../components/layout/SectionBlock';
import MasterControl from '../../../components/admin/MasterControl';
import PartnerResourcesAdmin from '../../../components/admin/PartnerResourcesAdmin';
import AutomationRules from '../../../components/admin/AutomationRules';
import BulkLeadImport from '../../../components/BulkLeadImport';
import PartnerSelect from '../../../components/PartnerSelect';
import ExportButton from '../../../components/ExportButton';
import AuditLog from '../../../components/admin/AuditLog';
import { api } from '../../../api';

/** Super Admin Tools & Data — forms, import/export, resources, automations, audit */
export default function AdminToolsPanel({
  pageInfo, token, load, flash, fail, partners, leads, openLeadDetail,
  bulkImportPartner, setBulkImportPartner,
}) {
  return (
    <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
      <MasterControl token={token} onRefresh={load} flash={flash} fail={fail} partners={partners} leads={leads} onOpenLead={openLeadDetail} />
      <SectionBlock title="Partner Resources" description="Share training, marketing, and product links with partners">
        <PartnerResourcesAdmin embedded />
      </SectionBlock>
      <AutomationRules embedded />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionBlock title="Import Leads">
          <PartnerSelect
            value={bulkImportPartner}
            onChange={setBulkImportPartner}
            placeholder="Select partner"
            className="dm-input mb-1"
          />
          <BulkLeadImport
            onImport={async (leadsData) => {
              if (!bulkImportPartner) {
                fail(new Error('Select a partner'));
                return;
              }
              const res = await api.admin.bulkLeads(bulkImportPartner, leadsData);
              flash(`Imported ${res.created} leads`);
              load();
            }}
          />
        </SectionBlock>
        <SectionBlock title="Export & Backup">
          <div className="space-y-3">
            <ExportButton href={api.admin.exportLeads()} token={token} label="Export Leads" />
            <ExportButton href={api.admin.exportPartners()} token={token} label="Export Partners" />
            <ExportButton href={api.admin.exportBackup()} token={token} label="Full Backup" />
          </div>
        </SectionBlock>
      </div>
      <SectionBlock title="Audit Log" description="Recent system changes">
        <AuditLog embedded />
      </SectionBlock>
    </DashboardSection>
  );
}
