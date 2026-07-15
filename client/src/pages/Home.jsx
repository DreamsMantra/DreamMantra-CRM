import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, School, GraduationCap, BookOpen,
  ArrowRight, HelpCircle,
  Store, MapPin, Target, BarChart3,
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import CompanyInfoSection, { CompanyFooter } from '../components/CompanyInfoSection';

const partnerTypes = [
  { icon: School, title: 'Schools', desc: 'Refer students for career counselling & assessments' },
  { icon: GraduationCap, title: 'Colleges', desc: 'Connect students to Dream Mantra programs' },
  { icon: BookOpen, title: 'Coaching Centers', desc: 'Partner for DMIT, psychometric & skill mapping' },
  { icon: Users, title: 'Teachers', desc: 'Individual educators referring motivated students' },
  { icon: Store, title: 'Agency Partners', desc: 'Own a Dream Mantra centre with territory rights, marketing kit & growth support' },
];

const agencyFeatures = [
  { icon: MapPin, title: 'Exclusive Territory', desc: 'Operate in your city/region with protected agency rights and branded centre support.' },
  { icon: Target, title: 'Lead Targets & KPIs', desc: 'Monthly lead goals, conversion tracking, and performance dashboards built for agency growth.' },
  { icon: Store, title: 'Multi-Centre Model', desc: 'Scale from single centre to master agency with outlet tracking and operations support.' },
  { icon: BarChart3, title: 'Agency Hub', desc: 'Dedicated CRM workspace with onboarding checklists, marketing kits, and centre performance views.' },
];

const faqs = [
  { q: 'How do I apply for an agency?', a: 'Click "Apply for Agency" on the homepage, fill in your territory and investment details, and our team will review your application within 48 hours.' },
  { q: 'How do I become a partner?', a: 'Register on our portal, fill in your organization details, and wait for admin approval (usually 24-48 hours).' },
  { q: 'When do conversions show on my dashboard?', a: 'When a student you referred completes counselling and is marked completed by our team, your dashboard updates automatically.' },
  { q: 'Can I import leads in bulk?', a: 'Yes! Use the Bulk Import feature to paste CSV data with student name, phone, class, and city.' },
  { q: 'How do I track my leads?', a: 'Your dashboard shows real-time status updates, timeline history, and admin notes for every lead.' },
];

export default function Home() {
  return (
    <div className="min-h-screen dm-hero-bg">
      <PublicNavbar />

      <section className="relative overflow-hidden px-4 pb-20 pt-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-orange/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white px-4 py-1.5 text-sm font-semibold text-gold-dark shadow-sm">
              Dream Mantra Partner CRM
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-stone-900 md:text-6xl">
              Grow Together with{' '}
              <span className="dm-gradient-text">Referral Partners</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
              Complete lead management for schools, colleges, coaching centers, teachers & agency partners.
              Submit leads, track counselling, and grow with Dream Mantra — all in one portal.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/signup" className="dm-btn-primary px-8 py-3 text-base">
                Become a Partner <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/signup?type=agency" className="dm-btn-gold px-8 py-3 text-base">Apply for Agency</Link>
              <Link to="/login" className="dm-btn-ghost px-8 py-3 text-base">Partner Login</Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Partner types', value: '5+' },
              { label: 'Pipeline stages', value: '8' },
              { label: 'Partner tiers', value: '4' },
              { label: 'Export & reports', value: '✓' },
            ].map((s) => (
              <div key={s.label} className="dm-stat-card text-center">
                <p className="font-display text-2xl font-bold text-gold-dark">{s.value}</p>
                <p className="text-xs text-stone-500">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="partners" className="border-t border-stone-200 bg-white px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center font-display text-3xl font-bold text-stone-900">Who Can Partner?</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {partnerTypes.map((p) => (
              <div key={p.title} className="dm-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark"><p.icon className="h-7 w-7" /></div>
                <h3 className="font-display font-bold text-stone-900">{p.title}</h3>
                <p className="mt-2 text-sm text-stone-500">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="agency" className="border-t border-stone-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white px-4 py-1.5 text-sm font-semibold text-gold-dark">
              <Store className="h-4 w-4" /> Dream Mantra Agency Program
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-stone-900">Own a Career Counselling Centre</h2>
            <p className="mx-auto mt-3 max-w-2xl text-stone-600">
              Launch your Dream Mantra agency with territory rights, onboarding support, marketing kit, and a dedicated Agency Hub in the CRM.
            </p>
            <Link to="/signup?type=agency" className="dm-btn-gold mt-8 inline-flex px-8 py-3">Apply for Agency</Link>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {agencyFeatures.map((f) => (
              <div key={f.title} className="dm-card p-6">
                <div className="mb-4 inline-flex rounded-xl bg-gold/15 p-3 text-gold-dark"><f.icon className="h-6 w-6" /></div>
                <h3 className="font-display font-bold text-stone-900">{f.title}</h3>
                <p className="mt-2 text-sm text-stone-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-stone-200 bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-3xl font-bold text-stone-900">How It Works</h2>
          <ol className="mt-10 space-y-4">
            {['Register as partner → Get admin approval', 'Submit leads individually or bulk import CSV', 'Track real-time status updates & comments', 'Follow students through counselling to completion', 'Receive payouts to your bank/UPI'].map((step, i) => (
              <li key={step} className="flex items-start gap-4 dm-card p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold-dark">{i + 1}</span>
                <span className="pt-1 text-stone-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="flex items-center justify-center gap-2 text-center font-display text-3xl font-bold text-stone-900"><HelpCircle className="h-8 w-8 text-gold" /> FAQ</h2>
          <div className="mt-10 space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="dm-card p-5">
                <h3 className="font-semibold text-stone-900">{f.q}</h3>
                <p className="mt-2 text-sm text-stone-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CompanyInfoSection />

      <section className="border-t border-stone-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-stone-900">Ready to partner with Dream Mantra?</h2>
        <Link to="/signup" className="dm-btn-primary mt-6 inline-flex px-8 py-3">Get Started</Link>
      </section>
      <CompanyFooter />
    </div>
  );
}
