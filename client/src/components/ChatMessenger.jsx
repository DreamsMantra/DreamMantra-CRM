import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Send, Paperclip, Image, FileText, Film, Music, Download, Search, RefreshCw,
} from 'lucide-react';
import { api } from '../api';

function fileIcon(type) {
  if (type === 'image') return Image;
  if (type === 'video') return Film;
  if (type === 'audio') return Music;
  return FileText;
}

function isAdminSender(role) {
  return role === 'admin' || role === 'super_admin';
}

function MessageBubble({ msg, isMine }) {
  const Icon = fileIcon(msg.type);
  const fileUrl = msg.fileUrl ? (msg.fileUrl.startsWith('/') ? msg.fileUrl : `/${msg.fileUrl}`) : '';

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${isMine ? 'bg-orange text-white rounded-br-md' : 'bg-white border border-stone-200 text-stone-800 rounded-bl-md'}`}>
        {!isMine && <p className="mb-1 text-[10px] font-bold uppercase opacity-70">{msg.senderName}</p>}
        {msg.text && <p className="whitespace-pre-wrap text-sm">{msg.text}</p>}
        {msg.fileUrl && (
          <div className="mt-2">
            {msg.type === 'image' ? (
              <a href={fileUrl} target="_blank" rel="noreferrer">
                <img src={fileUrl} alt={msg.fileName} className="max-h-48 rounded-lg" />
              </a>
            ) : msg.type === 'video' ? (
              <video src={fileUrl} controls className="max-h-48 max-w-full rounded-lg" />
            ) : msg.type === 'audio' ? (
              <audio src={fileUrl} controls className="w-full min-w-[200px]" />
            ) : (
              <a href={fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 rounded-lg p-2 text-sm ${isMine ? 'bg-white/20' : 'bg-stone-100'}`}>
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{msg.fileName}</span>
                <Download className="h-4 w-4 shrink-0" />
              </a>
            )}
          </div>
        )}
        <p className={`mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-stone-400'}`}>
          {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function ChatMessenger({ isAdmin, partners = [], onPartnersRefresh }) {
  const [inbox, setInbox] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const { inbox: list } = await api.messages.inbox();
      let merged = list || [];

      // Ensure newly created/updated partners always appear even before first message
      if (isAdmin && partners?.length) {
        const map = new Map(merged.map((c) => [c.otherUserId, c]));
        partners.forEach((p) => {
          const id = p.id || p._id;
          if (!id) return;
          if (!map.has(id)) {
            map.set(id, {
              otherUserId: id,
              otherUserName: p.name,
              otherUserRole: 'partner',
              otherUserAvatar: p.name?.charAt(0) || 'P',
              otherUserStatus: p.status,
              lastMessage: 'Start conversation',
              lastAt: p.createdAt || '',
              unread: 0,
            });
          } else {
            map.set(id, { ...map.get(id), otherUserName: p.name, otherUserStatus: p.status });
          }
        });
        merged = Array.from(map.values()).sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
      }

      setInbox(merged);
      if (isAdmin && !activeId && merged.length) setActiveId(merged[0].otherUserId);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, [isAdmin, activeId, partners]);

  const loadThread = useCallback(async (userId) => {
    if (!userId && isAdmin) return;
    const data = await api.messages.thread(userId);
    setMessages(data.messages || []);
    setOtherUser(data.otherUser);
    loadInbox();
  }, [isAdmin, loadInbox]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  useEffect(() => {
    if (isAdmin && activeId) loadThread(activeId);
    if (!isAdmin) loadThread();
  }, [activeId, isAdmin, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const t = setInterval(() => {
      if (isAdmin && activeId) loadThread(activeId);
      else if (!isAdmin) loadThread();
      else loadInbox();
    }, 8000);
    return () => clearInterval(t);
  }, [activeId, isAdmin, loadThread, loadInbox]);

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() && !file) return;
    if (isAdmin && !activeId) return;
    setSending(true);
    try {
      await api.messages.send({
        recipientId: isAdmin ? activeId : undefined,
        message: text,
        file,
      });
      setText('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      if (isAdmin) await loadThread(activeId);
      else await loadThread();
    } finally {
      setSending(false);
    }
  };

  const filteredInbox = useMemo(() => inbox.filter((c) => {
    const matchesSearch = !search || c.otherUserName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.otherUserStatus === statusFilter || (!c.otherUserStatus && statusFilter === 'all');
    return matchesSearch && matchesStatus;
  }), [inbox, search, statusFilter]);

  const refreshAll = async () => {
    await onPartnersRefresh?.();
    await loadInbox();
  };

  return (
    <div className="dm-card flex h-[calc(100vh-12rem)] min-h-[500px] overflow-hidden">
      {isAdmin && (
        <aside className="flex w-80 shrink-0 flex-col border-r border-stone-200 bg-stone-50">
          <div className="border-b border-stone-200 bg-gradient-to-r from-gold/10 to-orange/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display font-bold text-stone-900">Partner Messages</h2>
                <p className="text-xs text-stone-500">{inbox.length} partners · live list</p>
              </div>
              <button type="button" className="dm-btn-ghost p-2" title="Refresh partners" onClick={refreshAll}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="space-y-2 border-b border-stone-200 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input className="dm-input py-2 pl-9 text-sm" placeholder="Search partners..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="dm-input py-1.5 text-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All partners</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredInbox.length === 0 && (
              <p className="p-6 text-center text-sm text-stone-400">
                {loading ? 'Loading…' : 'No partners found. Approve or create a partner first.'}
              </p>
            )}
            {filteredInbox.map((c) => (
              <button
                key={c.otherUserId}
                type="button"
                onClick={() => setActiveId(c.otherUserId)}
                className={`flex w-full items-center gap-3 border-b border-stone-100 p-4 text-left transition hover:bg-white ${activeId === c.otherUserId ? 'bg-white ring-2 ring-inset ring-orange/30' : ''}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-orange text-lg font-bold text-white">
                  {c.otherUserAvatar || c.otherUserName?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-stone-900">{c.otherUserName}</p>
                    {c.unread > 0 && <span className="rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold text-white">{c.unread}</span>}
                  </div>
                  <p className="truncate text-xs text-stone-500">{c.lastMessage}</p>
                  {c.otherUserStatus && (
                    <p className="mt-0.5 text-[10px] capitalize text-stone-400">{c.otherUserStatus}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div className="flex flex-1 flex-col bg-[#e5ddd5]/30">
        {(otherUser || !isAdmin) && (
          <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 font-bold text-gold-dark">
              {otherUser?.name?.charAt(0) || 'D'}
            </div>
            <div>
              <p className="font-semibold text-stone-900">{otherUser?.name || 'Dream Mantra Support'}</p>
              <p className="text-xs text-stone-500">{isAdmin ? 'Partner' : 'Admin Support'} · {otherUser?.email}</p>
            </div>
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!isAdmin || activeId ? (
            messages.map((m) => (
              <MessageBubble key={m.id} msg={m} isMine={isAdmin ? isAdminSender(m.senderRole) : m.senderRole === 'partner'} />
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-stone-400">Select a partner to start chatting</div>
          )}
          <div ref={bottomRef} />
        </div>

        {(!isAdmin || activeId) && (
          <form onSubmit={send} className="border-t border-stone-200 bg-white p-3">
            {file && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-stone-100 px-3 py-2 text-sm">
                <Paperclip className="h-4 w-4" />
                <span className="truncate flex-1">{file.name}</span>
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} className="text-red-500">×</button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <button type="button" onClick={() => fileRef.current?.click()} className="dm-btn-ghost shrink-0 p-2.5" title="Attach file">
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                className="dm-input max-h-32 min-h-[44px] flex-1 resize-none py-2.5"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
              />
              <button type="submit" disabled={sending || (!text.trim() && !file)} className="dm-btn-primary shrink-0 p-2.5">
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-center text-[10px] text-stone-400">Photos · Videos · Audio · PDF · Word · Excel · PPT · ZIP (max 25MB)</p>
          </form>
        )}
      </div>
    </div>
  );
}
