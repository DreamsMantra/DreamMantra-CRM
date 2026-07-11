import { ExternalLink, Globe, MapPin, Mail, Phone, Users } from 'lucide-react';
import { COMPANY, COMPANY_BRANCHES, COMPANY_LINKS, COMPANY_TEAM } from '../utils/companyInfo';

export default function CompanyInfoSection({ compact = false }) {
  if (compact) {
    return (
      <div className="space-y-3 text-sm text-stone-500">
        <p>{COMPANY.shortAbout}</p>
        <a href={COMPANY.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-gold-dark hover:text-orange">
          <Globe className="h-4 w-4" /> dreammantra.in <ExternalLink className="h-3 w-3" />
        </a>
        <p className="text-xs">{COMPANY.phone} · {COMPANY.email}</p>
      </div>
    );
  }

  return (
    <section id="about" className="border-t border-stone-200 bg-white px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-sm font-semibold text-gold-dark">
            <Globe className="h-4 w-4" /> About Dream Mantra
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-stone-900">dreammantra.in</h2>
          <p className="mx-auto mt-3 max-w-2xl text-stone-600">{COMPANY.shortAbout}</p>
          <a
            href={COMPANY.website}
            target="_blank"
            rel="noreferrer"
            className="dm-btn-gold mt-6 inline-flex"
          >
            Visit Website <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="dm-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display font-bold text-stone-900">
              <Users className="h-5 w-5 text-gold-dark" /> Leadership & Team
            </h3>
            <ul className="space-y-4">
              {COMPANY_TEAM.map((person) => (
                <li key={person.name} className="border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                  <p className="font-semibold text-stone-900">{person.name}</p>
                  <p className="text-sm text-gold-dark">{person.role}</p>
                  <p className="mt-1 text-xs text-stone-500">{person.note}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="dm-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display font-bold text-stone-900">
              <MapPin className="h-5 w-5 text-gold-dark" /> Centres & Branches
            </h3>
            <p className="mb-4 text-sm text-stone-600">{COMPANY.city} · {COMPANY.hours}</p>
            <ul className="space-y-2">
              {COMPANY_BRANCHES.map((b) => (
                <li key={b.name} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
                  <span className="font-medium text-stone-800">{b.name}</span>
                  <span className="text-stone-500">{b.city}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="dm-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display font-bold text-stone-900">
              <Globe className="h-5 w-5 text-gold-dark" /> Website Links
            </h3>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-stone-700 transition hover:bg-gold/5 hover:text-gold-dark"
                  >
                    {link.label}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-2 border-t border-stone-100 pt-4 text-sm text-stone-600">
              <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-2 hover:text-gold-dark">
                <Mail className="h-4 w-4" /> {COMPANY.email}
              </a>
              <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-gold-dark">
                <Phone className="h-4 w-4" /> {COMPANY.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CompanyFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white px-4 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 text-sm text-stone-500 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold text-gold-dark">{COMPANY.name}</p>
          <p className="mt-1">{COMPANY.tagline}</p>
          <a href={COMPANY.website} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-stone-700 hover:text-gold-dark">
            dreammantra.in <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div>
          <p className="mb-2 font-semibold text-stone-800">Jaipur Centres</p>
          <p>Raja Park · Shastri Nagar · Nirman Nagar</p>
          <p className="mt-1">+ Pan-India online · {COMPANY.hours}</p>
        </div>
        <div>
          <p className="mb-2 font-semibold text-stone-800">Contact</p>
          <p>{COMPANY.email}</p>
          <p>{COMPANY.phone}</p>
          <p className="mt-2 text-xs text-stone-400">
            Founder: Esha Tibrewal · Co-Founder: Shivam Lohiya · Developer: Ishant Goyal
          </p>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-stone-400">© {new Date().getFullYear()} Dream Mantra · Partner CRM</p>
    </footer>
  );
}
