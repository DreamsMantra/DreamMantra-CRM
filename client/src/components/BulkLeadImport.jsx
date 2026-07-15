import { useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

const SAMPLE = `studentName,studentPhone,classGrade,city,notes
Rahul Sharma,9876543210,Class 12,Jaipur,Interested in DMIT
Priya Patel,9876543211,B.Tech 2nd Year,Jaipur,Career counselling`;

export default function BulkLeadImport({ onImport, loading }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const parseCSV = (raw) => {
    const lines = raw.trim().split('\n').filter(Boolean);
    if (lines.length < 2) throw new Error('Need header row + at least one data row');
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(',').map((v) => v.trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ''; });
      return row;
    });
  };

  const handleImport = async () => {
    setError('');
    try {
      const leads = parseCSV(text);
      await onImport(leads);
    } catch (e) {
      setError(e.message || 'Import failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-gold/40 bg-amber-50/50 p-4">
        <div className="flex items-center gap-2 text-gold-dark">
          <FileSpreadsheet className="h-5 w-5" />
          <span className="font-semibold">CSV Format</span>
        </div>
        <p className="mt-1 text-sm text-stone-600">Columns: studentName, studentPhone, classGrade, city, notes (required: name & phone)</p>
        <button type="button" onClick={() => setText(SAMPLE)} className="mt-2 text-sm font-medium text-orange hover:underline">Load sample</button>
      </div>
      <textarea
        className="dm-input min-h-[160px] font-mono text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste CSV data here..."
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="button" onClick={handleImport} disabled={loading || !text.trim()} className="dm-btn-primary">
        <Upload className="h-4 w-4" /> Import Leads
      </button>
    </div>
  );
}
