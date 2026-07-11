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
| Backend  | Node.js, Express, JSON file DB, JWT |

---

## Quick Start

### Prerequisites
- **Node.js 18+**
- No database install required (uses JSON file storage in `backend/data/store.json`)

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API runs at **http://localhost:5001**

Default admin (auto-created on first run):
- Email: `admin@dreammantra.in`
- Password: `Admin@123`

### 2. Frontend Setup

```bash
cd client
npm install
npm run dev
```

App runs at **http://localhost:5174**

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
