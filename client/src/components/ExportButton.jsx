import { Download } from 'lucide-react';

export default function ExportButton({ href, label = 'Export CSV', token }) {
  const handleClick = async () => {
    const res = await fetch(href, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button type="button" onClick={handleClick} className="dm-btn-ghost text-sm">
      <Download className="h-4 w-4" /> {label}
    </button>
  );
}
