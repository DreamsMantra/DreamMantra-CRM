import DashboardSection from '../../../components/layout/DashboardSection';
import SectionBlock from '../../../components/layout/SectionBlock';
import MasterControl from '../../../components/admin/MasterControl';
import PartnerResourcesAdmin from '../../../components/admin/PartnerResourcesAdmin';
import AutomationRules from '../../../components/admin/AutomationRules';

/** Super Admin Tools — forms, bulk import, resources, automations */
export default function AdminToolsPanel({
  pageInfo, token, load, flash, fail, partners, leads, openLeadDetail,
}) {
  return (
    <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
      <MasterControl token={token} onRefresh={load} flash={flash} fail={fail} partners={partners} leads={leads} onOpenLead={openLeadDetail} />
      <SectionBlock title="Partner Resources" description="Share training, marketing, and product links with partners">
        <PartnerResourcesAdmin embedded />
      </SectionBlock>
      <AutomationRules embedded />
    </DashboardSection>
  );
}
