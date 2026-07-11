# MongoDB Atlas Setup — Dream Mantra CRM

Your Atlas account: **dreammantra1@gmail.com** · Project **Project 0** · Cluster **Cluster0**

## Step 1 — Wait for cluster

In Atlas, wait until **Cluster0** shows **Active** (not "deploying changes").

## Step 2 — Database user

1. Atlas left menu → **Security** → **Database Access**
2. **Add New Database User**
3. Username: `dreammantra_crm` (or any name)
4. Password: generate a strong password and **save it**
5. Privileges: **Read and write to any database**
6. **Add User**

## Step 3 — Network access (IP whitelist)

1. **Security** → **Network Access** → **Add IP Address**
2. For development: **Allow Access from Anywhere** (`0.0.0.0/0`)
3. For production: add your server IP only
4. **Confirm**

## Step 4 — Get connection string

1. **Database** → **Clusters** → **Cluster0** → **Connect**
2. Choose **Drivers** → **Node.js** (version 5.5 or later)
3. Copy the connection string, e.g.:

```
mongodb+srv://dreammantra_crm:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

4. Replace `<password>` with your database user password (URL-encode special chars like `@`, `#`, `%`)

## Step 5 — Add to CRM `.env`

Edit `backend/.env`:

```env
MONGODB_URI=mongodb+srv://dreammantra_crm:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/dreammantra_crm?retryWrites=true&w=majority
```

Use database name **`dreammantra_crm`** in the URI (before `?`).

## Step 6 — Install & run

```bash
cd backend
npm install
npm run dev
```

On first start with Atlas:
- Existing `backend/data/store.json` is **automatically migrated** to MongoDB
- You should see: `✓ Migrated local store.json → MongoDB Atlas`

Or run migration manually:

```bash
cd backend
npm run migrate:mongo
```

## Step 7 — Verify

Open: http://localhost:5001/api/health

Expected:

```json
{
  "ok": true,
  "db": "connected",
  "storage": "mongodb",
  "mongo": "connected"
}
```

## Without Atlas (local JSON fallback)

Leave `MONGODB_URI` empty in `.env` — CRM uses `backend/data/store.json` as before.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `authentication failed` | Wrong username/password in URI |
| `IP not whitelisted` | Add your IP in Network Access |
| `querySrv ENOTFOUND` | Check cluster hostname in URI |
| Special chars in password | URL-encode (`@` → `%40`, etc.) |

## Atlas data location

- **Collection:** `crm_store`
- **Database:** `dreammantra_crm`
- **Document ID:** `main` (full CRM snapshot)

You can view data in Atlas → **Browse Collections** after first API start.
