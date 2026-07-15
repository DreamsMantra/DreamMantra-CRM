import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import StatusBadge from '../StatusBadge';
import Modal from '../Modal';
import AdminPageHeader, { EditButton } from './AdminPageHeader';
import { LEAD_STATUSES } from '../../utils/constants';

const VIEW_MODES = [
  { id: 'all', label: 'All kids' },
  { id: 'agency', label: 'By Agency' },
  { id: 'project', label: 'Project' },
];

export default function StudentsPanel({
  assignMode = false,
  staffUsers = [],
  partners = [],
  onEditLead,
  embedded = false,
  apiMode = 'admin',
}) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [kidsView, setKidsView] = useState('all');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    const fetcher = apiMode === 'staff' ? api.staff.students : api.admin.students;
    return fetcher()
      .then((r) => setStudents(r.students || []))
      .catch((e) => setError(e.message || 'Failed to load students'));
  };

  useEffect(() => { load(); }, [apiMode]);

  const projectOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.project) set.add(String(s.project));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const agencyPartners = useMemo(
    () => (partners || []).filter((p) => p.status === 'active' || !p.status),
    [partners]
  );

  const filtered = students.filter((s) => {
    if (kidsView === 'agency' && agencyFilter !== 'all' && s.partnerId !== agencyFilter) return false;
    if (kidsView === 'project') {
      if (projectFilter === 'all') {
        /* show all when no specific project picked */
      } else if ((s.project || '') !== projectFilter) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.studentName || '').toLowerCase().includes(q)
      || (s.mobile || '').includes(q)
      || (s.leadId || '').toLowerCase().includes(q)
      || (s.project || '').toLowerCase().includes(q)
      || (s.partnerName || '').toLowerCase().includes(q);
  });

  const openEdit = (s) => {
    if (onEditLead && apiMode === 'admin') { onEditLead({ id: s.id, ...s }); return; }
    setEditForm({
      id: s.id,
      studentName: s.studentName || '',
      parentName: s.parentName || '',
      mobile: s.mobile || '',
      classGrade: s.classGrade || '',
      school: s.school || '',
      status: s.status || 'new',
      assignedSalesId: s.assignedSalesId || '',
      assignedCounsellorId: s.assignedCounsellorId || '',
      notes: s.notes || '',
      followUpDate: s.followUpDate?.slice?.(0, 10) || '',
      priority: s.priority || 'medium',
    });
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { id, ...body } = editForm;
      if (apiMode === 'staff') {
        await api.staff.updateLead(id, {
          studentName: body.studentName,
          parentName: body.parentName,
          studentPhone: body.mobile,
          classGrade: body.classGrade,
          schoolCollege: body.school,
          status: body.status,
          notes: body.notes,
          followUpDate: body.followUpDate || undefined,
          priority: body.priority,
        });
      } else {
        await api.admin.editLead(id, {
          studentName: body.studentName,
          parentName: body.parentName,
          studentPhone: body.mobile,
          classGrade: body.classGrade,
          schoolCollege: body.school,
        });
        await api.admin.updateLead(id, {
          assignedSalesId: body.assignedSalesId || undefined,
          assignedCounsellorId: body.assignedCounsellorId || undefined,
          status: body.status,
        });
      }
      setMsg('Student updated');
      setEditModal(false);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-4">
      {!embedded && <AdminPageHeader title="Students" subtitle={`${students.length} students in pipeline`} onRefresh={load} />}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {VIEW_MODES.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setKidsView(v.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${kidsView === v.id ? 'bg-orange text-white' : 'bg-stone-100 text-stone-600'}`}
          >
            {v.label}
          </button>
        ))}
        {kidsView === 'agency' && (
          <select className="dm-input w-auto min-w-[180px]" value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)}>
            <option value="all">All agencies / partners</option>
            {agencyPartners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        {kidsView === 'project' && (
          <select className="dm-input w-auto min-w-[160px]" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">All projects</option>
            {projectOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>

      <input className="dm-input max-w-md" placeholder="Search name, mobile, Dreamz ID…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="dm-card overflow-x-auto">
        <table className="dm-table w-full">
          <thead>
            <tr>
              <th>Dreamz ID</th><th>Student</th><th>Parent</th><th>Mobile</th><th>Class</th><th>School</th>
              <th>Project</th><th>Partner</th><th>Product</th><th>Status</th>
              {assignMode && <th>Assign Sales</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs">{s.leadId}</td>
                <td className="font-medium">{s.studentName}</td>
                <td>{s.parentName || '—'}</td>
                <td>{s.mobile}</td>
                <td>{s.classGrade || '—'}</td>
                <td>{s.school || '—'}</td>
                <td className="text-xs">{s.project || '—'}</td>
                <td className="text-xs">{s.partnerName || '—'}</td>
                <td className="text-xs">{(s.products || []).join(', ') || '—'}</td>
                <td><StatusBadge status={s.status} /></td>
                {assignMode && (
                  <td>
                    <select className="dm-input text-xs py-1" value={s.assignedSalesId || ''} onChange={async (e) => {
                      await api.admin.updateLead(s.id, { assignedSalesId: e.target.value, assignedTo: e.target.value });
                      load();
                    }}>
                      <option value="">Unassigned</option>
                      {staffUsers.filter((u) => u.role === 'sales_executive').map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>
                )}
                <td><EditButton onClick={() => openEdit(s)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="p-8 text-center text-stone-500">No students in pipeline yet.</p>}
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Update Student">
        <form onSubmit={saveEdit} className="space-y-3">
          <input className="dm-input" placeholder="Student name" value={editForm.studentName || ''} onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })} required />
          <input className="dm-input" placeholder="Parent name" value={editForm.parentName || ''} onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })} />
          <input className="dm-input" placeholder="Mobile" value={editForm.mobile || ''} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="dm-input" placeholder="Class" value={editForm.classGrade || ''} onChange={(e) => setEditForm({ ...editForm, classGrade: e.target.value })} />
            <input className="dm-input" placeholder="School" value={editForm.school || ''} onChange={(e) => setEditForm({ ...editForm, school: e.target.value })} />
          </div>
          <select className="dm-input" value={editForm.status || 'new'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
            {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {apiMode === 'staff' && (
            <>
              <input type="date" className="dm-input" value={editForm.followUpDate || ''} onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })} />
              <select className="dm-input" value={editForm.priority || 'medium'} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                {['low', 'medium', 'high'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <textarea className="dm-input" placeholder="Notes" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </>
          )}
          {apiMode === 'admin' && (
            <>
              <select className="dm-input" value={editForm.assignedSalesId || ''} onChange={(e) => setEditForm({ ...editForm, assignedSalesId: e.target.value })}>
                <option value="">Sales — Unassigned</option>
                {staffUsers.filter((u) => u.role === 'sales_executive').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select className="dm-input" value={editForm.assignedCounsellorId || ''} onChange={(e) => setEditForm({ ...editForm, assignedCounsellorId: e.target.value })}>
                <option value="">Counsellor — Unassigned</option>
                {staffUsers.filter((u) => u.role === 'counsellor').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </>
          )}
          <button type="submit" className="dm-btn-primary w-full">Save Changes</button>
        </form>
      </Modal>
    </div>
  );
}
