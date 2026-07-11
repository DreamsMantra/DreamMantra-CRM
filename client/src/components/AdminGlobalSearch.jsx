import { useEffect, useState, useCallback } from 'react';
import { Search, Users, ClipboardList, Command, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';

export default function AdminGlobalSearch({ onSelectPartner, onSelectLead }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ partners: [], leads: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const search = useCallback(async (q) => {
    if (q.length < 2) {
      setResults({ partners: [], leads: [] });
      return;
    }
    setLoading(true);
    try {
      const data = await api.admin.search(q);
      setResults(data);
    } catch {
      setResults({ partners: [], leads: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setResults({ partners: [], leads: [] });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="dm-btn-ghost hidden items-center gap-2 text-sm text-stone-500 sm:inline-flex"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search CRM</span>
        <kbd className="hidden rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] md:inline">Ctrl+K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-start justify-center bg-stone-900/40 p-4 pt-[12vh] backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
                <Command className="h-5 w-5 text-gold-dark" />
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-lg outline-none placeholder:text-stone-400"
                  placeholder="Search partners, leads, phones, IDs..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button type="button" onClick={close}><X className="h-5 w-5 text-stone-400" /></button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-2">
                {loading && <p className="p-4 text-center text-sm text-stone-400">Searching...</p>}
                {!loading && query.length >= 2 && !results.partners.length && !results.leads.length && (
                  <p className="p-4 text-center text-sm text-stone-400">No results for "{query}"</p>
                )}
                {results.partners.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-400">Partners</p>
                    {results.partners.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-stone-50"
                        onClick={() => { onSelectPartner?.(p); close(); }}
                      >
                        <Users className="h-4 w-4 text-gold-dark" />
                        <div>
                          <p className="font-semibold text-stone-900">{p.name}</p>
                          <p className="text-xs text-stone-500">{p.loginId} · {p.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {results.leads.length > 0 && (
                  <div>
                    <p className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-400">Leads</p>
                    {results.leads.map((l) => (
                      <button
                        key={l.id || l._id}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-stone-50"
                        onClick={() => { onSelectLead?.(l); close(); }}
                      >
                        <ClipboardList className="h-4 w-4 text-orange" />
                        <div>
                          <p className="font-semibold text-stone-900">{l.studentName}</p>
                          <p className="text-xs text-stone-500">{l.leadId} · {l.studentPhone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {query.length < 2 && (
                  <p className="p-6 text-center text-sm text-stone-400">Type at least 2 characters to search</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
