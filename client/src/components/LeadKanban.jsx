import { useState } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, User, Phone } from 'lucide-react';
import { LEAD_STATUSES } from '../utils/constants';

const KANBAN_STATUSES = LEAD_STATUSES.filter((s) => !['lost'].includes(s.value));

export default function LeadKanban({ leads, onStatusChange, onOpenLead }) {
  const [dragging, setDragging] = useState(null);

  const grouped = KANBAN_STATUSES.reduce((acc, s) => {
    acc[s.value] = leads.filter((l) => l.status === s.value);
    return acc;
  }, {});

  const handleDrop = (status) => {
    if (dragging && dragging.status !== status) {
      onStatusChange(dragging, status);
    }
    setDragging(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_STATUSES.map((col) => (
        <div
          key={col.value}
          className="min-w-[260px] flex-1 rounded-2xl border border-stone-200 bg-stone-50/80"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(col.value)}
        >
          <div className="sticky top-0 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-800">{col.label}</h3>
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-bold text-stone-600">
                {grouped[col.value]?.length || 0}
              </span>
            </div>
          </div>
          <div className="space-y-2 p-3 min-h-[200px]">
            {(grouped[col.value] || []).map((lead) => (
              <motion.div
                key={lead.id || lead._id}
                layout
                draggable
                onDragStart={() => setDragging(lead)}
                onDragEnd={() => setDragging(null)}
                onClick={() => onOpenLead?.(lead)}
                className={`dm-card cursor-grab p-3 transition hover:shadow-md active:cursor-grabbing ${
                  dragging?.id === lead.id ? 'opacity-50 ring-2 ring-orange' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-1 h-4 w-4 shrink-0 text-stone-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-stone-900">{lead.studentName}</p>
                    <p className="text-xs text-gold-dark">{lead.leadId}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{lead.partnerName || lead.partner?.name}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.studentPhone}</span>
                    </div>
                    {lead.priority === 'high' && (
                      <span className="dm-badge mt-2 bg-red-100 text-red-700">High Priority</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
