import { useEffect, useState } from 'react';
import { api } from '../../api';
import StatusBadge from '../StatusBadge';
import Modal from '../Modal';
import AdminPageHeader, { EditButton } from './AdminPageHeader';
import { LEAD_STATUSES } from '../../utils/constants';

export default function StudentsPanel({ assignMode = false, staffUsers = [], onEditLead, embedded = false }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState('');

  const load = () => api.admin.students().then((r) => setStudents(r.students || []));

  useEffect(() => { load(); }, []);

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.studentName || '').toLowerCase().includes(q) || (s.mobile || '').includes(q) || (s.leadId || '').toLowerCase().includes(q);
  });

  const openEdit = (s) => {
    if (onEditLead) { onEditLead({ id: s.id, ...s }); return; }
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
    });
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const { id, ...body } = editForm;
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
    setMsg('Student updated');
    setEditModal(false);
    load();
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="space-y-4">
      {!embedded && <AdminPageHeader title="Students" subtitle={`${students.length} students in pipeline`} onRefresh={load} />}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      <input className="dm-input max-w-md" placeholder="Search name, mobile, lead ID…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="dm-card overflow-x-auto">
        <table className="dm-table w-full">
          <thead>
            <tr>
              <th>Lead ID</th><th>Student</th><th>Parent</th><th>Mobile</th><th>Class</th><th>School</th><th>Product</th><th>Status</th>
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
          <input className="dm-input" placeholder="Student name" value={editForm.studentName} onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })} required />
          <input className="dm-input" placeholder="Parent name" value={editForm.parentName} onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })} />
          <input className="dm-input" placeholder="Mobile" value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="dm-input" placeholder="Class" value={editForm.classGrade} onChange={(e) => setEditForm({ ...editForm, classGrade: e.target.value })} />
            <input className="dm-input" placeholder="School" value={editForm.school} onChange={(e) => setEditForm({ ...editForm, school: e.target.value })} />
          </div>
          <select className="dm-input" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
            {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="dm-input" value={editForm.assignedSalesId} onChange={(e) => setEditForm({ ...editForm, assignedSalesId: e.target.value })}>
            <option value="">Sales — Unassigned</option>
            {staffUsers.filter((u) => u.role === 'sales_executive').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="dm-input" value={editForm.assignedCounsellorId} onChange={(e) => setEditForm({ ...editForm, assignedCounsellorId: e.target.value })}>
            <option value="">Counsellor — Unassigned</option>
            {staffUsers.filter((u) => u.role === 'counsellor').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button type="submit" className="dm-btn-primary w-full">Save Changes</button>
        </form>
      </Modal>
    </div>
  );
}
