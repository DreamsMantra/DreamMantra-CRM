# Dream Mantra CRM

A complete **Partner & Lead Management CRM** for Dream Mantra's referral network — schools, colleges, coaching centers, teachers, and referral partners.

Built with the same **Dream Mantra theme** (Gold · Orange · Dark Green · Plus Jakarta Sans).

## Features

### Partner Portal
- Register as partner (pending admin approval)
- Submit student leads with full details
- Track lead status in real-time (8-stage pipeline)
- View status timeline & admin notes
- Commission tracking & payout status
- Referral code sharing
- Notifications on status updates
- Profile management

### Admin Dashboard
- Analytics overview (partners, leads, conversions, commissions)
- Create & manage referral partners
- Approve/reject partner registrations
- Manage all leads & update status
- Auto commission generation on conversion
- Approve & mark commissions as paid
- Top partners & partner type breakdown

### Lead Pipeline Statuses
`New` → `Contacted` → `Interested` → `Counselling Scheduled` → `Assessment Done` → `Converted` / `Lost` / `On Hold`

### Partner Types
Referral Partner · Teacher · School · College · Coaching Center · Influencer · Counsellor

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend  | Node.js, Express, MongoDB Atlas (or JSON file fallback), JWT |

---

## Quick Start

### Prerequisites
- **Node.js 18+**
- **MongoDB Atlas** (recommended) — see [MONGODB_ATLAS_SETUP.md](./MONGODB_ATLAS_SETUP.md)
- Or use local JSON file storage (`backend/data/store.json`) if `MONGODB_URI` is not set

### Run everything (recommended)

From the project root:

```bash
npm install
npm run dev
```

- **App:** http://localhost:5174  
- **API:** http://localhost:5001  

Default admin (auto-created on first run):
- Email: `admin@dreammantra.in`
- Password: `Unlocked.dreams@2000`

### Or run backend & frontend separately

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env   # first time only — add MONGODB_URI for Atlas
npm install
npm run dev

# Terminal 2 — frontend
cd client
npm install
npm run dev
```

---

## Project Structure

```
Cream Mantra CRM/
├── backend/
│   ├── models/          # User, Lead, Commission, Notification
│   ├── routes/          # auth, partner, admin APIs
│   ├── middleware/      # JWT auth
│   └── index.js
├── client/
│   ├── src/
│   │   ├── pages/       # Home, Login, Signup, Dashboards
│   │   ├── components/  # UI components
│   │   └── context/     # Auth
│   └── index.html
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Partner registration |
| POST | `/api/auth/login` | Login |
| GET | `/api/partner/dashboard` | Partner stats |
| POST | `/api/partner/leads` | Submit lead |
| GET | `/api/admin/dashboard` | Admin analytics |
| POST | `/api/admin/partners` | Create partner |
| PATCH | `/api/admin/leads/:id` | Update lead status |

---

## Production Build

```bash
cd client && npm run build
cd ../backend && NODE_ENV=production npm start
```

The backend serves the built client from `client/dist` when available.

---

## Contact

**Dream Mantra** — Education & Career Counselling  
📧 info@dreammantra.in · 📞 +91 9680102276
