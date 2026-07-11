import { useState } from 'react';
import { Send, Lock } from 'lucide-react';
import { formatDate } from '../utils/constants';

export default function LeadComments({ comments = [], onAdd, canAddInternal = false }) {
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await onAdd(message, isInternal);
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="max-h-60 space-y-3 overflow-y-auto">
        {comments.length === 0 && <p className="text-sm text-stone-400">No comments yet</p>}
        {comments.map((c) => (
          <div key={c.id} className={`rounded-xl p-3 ${c.isInternal ? 'border border-amber-200 bg-amber-50' : 'bg-stone-50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-800">{c.userName}</span>
              <span className="text-xs text-stone-400">{formatDate(c.createdAt)}</span>
            </div>
            {c.isInternal && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700"><Lock className="h-3 w-3" /> Internal</span>
            )}
            <p className="mt-1 text-sm text-stone-600">{c.message}</p>
          </div>
        ))}
      </div>
      {onAdd && (
        <form onSubmit={submit} className="flex gap-2">
          <input className="dm-input flex-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a comment..." />
          {canAddInternal && (
            <label className="flex items-center gap-1 text-xs text-stone-500">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} /> Internal
            </label>
          )}
          <button type="submit" disabled={sending} className="dm-btn-primary shrink-0"><Send className="h-4 w-4" /></button>
        </form>
      )}
    </div>
  );
}
