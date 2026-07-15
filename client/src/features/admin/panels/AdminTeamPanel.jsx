import DashboardSection from '../../../components/layout/DashboardSection';
import UserManagement from '../../../components/admin/UserManagement';
import RolesPermissions from '../../../components/admin/RolesPermissions';
import LeadAssignments from '../../../components/admin/LeadAssignments';
import TaskBoard from '../../../components/admin/TaskBoard';
import CalendarView from '../../../components/admin/CalendarView';
import { ADMIN_SUB_TABS } from '../../../config/adminTabs';

export default function AdminTeamPanel({
  pageInfo, innerSub, setInner, leads, staffUsers, load, openLeadDetail,
}) {
  return (
    <DashboardSection
      title={pageInfo.title}
      description={pageInfo.desc}
      subTabs={ADMIN_SUB_TABS.team}
      activeSub={innerSub}
      onSubChange={setInner}
    >
      {innerSub === 'users' && <UserManagement />}
      {innerSub === 'roles' && <RolesPermissions />}
      {innerSub === 'assignments' && <LeadAssignments leads={leads} staffUsers={staffUsers} onRefresh={load} />}
      {innerSub === 'tasks' && <TaskBoard staffUsers={staffUsers} embedded />}
      {innerSub === 'calendar' && <CalendarView onSelectLead={openLeadDetail} leads={leads} embedded />}
    </DashboardSection>
  );
}
