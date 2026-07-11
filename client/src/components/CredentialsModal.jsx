import { useState } from 'react';
import { Copy, Check, Printer, Shield, KeyRound, Mail, Hash } from 'lucide-react';
import Modal from './Modal';

export default function CredentialsModal({ open, onClose, credentials, partnerName }) {
  const [copied, setCopied] = useState('');

  if (!credentials) return null;

  const lines = [
    `Dream Mantra Partner Login`,
    `Name: ${partnerName || 'Partner'}`,
    `Partner ID: ${credentials.loginId}`,
    `Email: ${credentials.email}`,
    `Password: ${credentials.password}`,
    `Referral Code: ${credentials.referralCode || ''}`,
    `Login: ${window.location.origin}/login`,
  ].join('\n');

  const copy = async (text, key) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const printCard = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Partner Credentials</title>
      <style>
        body { font-family: system-ui; padding: 40px; max-width: 480px; margin: auto; }
        .card { border: 2px solid #C9A84C; border-radius: 16px; padding: 32px; }
        h1 { color: #B8922E; margin: 0 0 8px; font-size: 22px; }
        .row { margin: 12px 0; padding: 10px; background: #FAFAF7; border-radius: 8px; }
        .label { font-size: 11px; text-transform: uppercase; color: #6b6560; }
        .value { font-size: 18px; font-weight: 700; font-family: monospace; margin-top: 4px; }
        .pwd { color: #FF6B4A; }
      </style></head><body>
      <div class="card">
        <h1>Dream Mantra Partner Access</h1>
        <p>${partnerName || 'Partner'}</p>
        <div class="row"><div class="label">Partner ID</div><div class="value">${credentials.loginId}</div></div>
        <div class="row"><div class="label">Email</div><div class="value">${credentials.email}</div></div>
        <div class="row"><div class="label">Password</div><div class="value pwd">${credentials.password}</div></div>
        <div class="row"><div class="label">Referral Code</div><div class="value">${credentials.referralCode || '—'}</div></div>
        <p style="margin-top:24px;font-size:12px;color:#6b6560">Share securely. Partner should change password after first login.</p>
      </div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const fields = [
    { key: 'loginId', label: 'Partner ID', icon: Hash, value: credentials.loginId },
    { key: 'email', label: 'Email', icon: Mail, value: credentials.email },
    { key: 'password', label: 'Password', icon: KeyRound, value: credentials.password, highlight: true },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Partner Login Credentials" wide>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-orange/5 p-4">
          <Shield className="h-6 w-6 shrink-0 text-gold-dark" />
          <div>
            <p className="font-semibold text-stone-900">Account created for {partnerName}</p>
            <p className="mt-1 text-sm text-stone-600">
              Share these credentials with the partner. They can sign in using <strong>Partner ID</strong> or <strong>email</strong>.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(({ key, label, icon: Icon, value, highlight }) => (
            <div key={key} className={`rounded-xl border p-4 ${highlight ? 'border-orange/30 bg-orange/5 sm:col-span-2' : 'border-stone-200 bg-stone-50'}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
                <button type="button" onClick={() => copy(value, key)} className="text-gold-dark hover:text-orange">
                  {copied === key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className={`mt-2 font-mono text-lg font-bold ${highlight ? 'text-orange' : 'text-stone-900'}`}>{value}</p>
            </div>
          ))}
          {credentials.referralCode && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Referral Code</span>
              <p className="mt-2 font-mono text-lg font-bold text-gold-dark">{credentials.referralCode}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => copy(lines, 'all')} className="dm-btn-primary flex-1">
            {copied === 'all' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy All
          </button>
          <button type="button" onClick={printCard} className="dm-btn-gold flex-1">
            <Printer className="h-4 w-4" /> Print Card
          </button>
          <button type="button" onClick={onClose} className="dm-btn-ghost w-full sm:w-auto">Done</button>
        </div>
      </div>
    </Modal>
  );
}
