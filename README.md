# CiteOut

Generate accurate citations in seconds. Supports APA 7th, MLA 9th, Chicago 17th, IEEE, Harvard, and Vancouver from DOIs, URLs, PDFs, DOCX files, or manual entry.

## Tech Stack

- **Frontend/Backend**: Next.js 15 (App Router), TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (credentials + Google OAuth)
- **Styling**: Tailwind CSS v4
- **Parsing**: pdf-parse (PDF), mammoth (DOCX), cheerio (web scraping)
- **Metadata**: CrossRef API (DOI lookup)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd citeout
npm install
```

### 2. Environment setup

```bash
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, and optionally GOOGLE_CLIENT_ID/SECRET
```

### 3. Database setup

```bash
npx prisma migrate dev --name init
npm run db:seed  # Creates admin@citeout.com / CiteOut@Admin2026
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Random secret (min 32 chars) | Yes |
| `NEXTAUTH_URL` | App URL (e.g. http://localhost:3000) | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No |
| `CROSSREF_API_EMAIL` | Email for CrossRef polite pool | No |

## Features

- **6 Citation Styles**: APA 7th, MLA 9th, Chicago 17th, IEEE, Harvard, Vancouver
- **Multiple Input Sources**: DOI, URL, PDF upload, DOCX upload, manual entry
- **Journal Rank Badges**: Q1–Q4 badges displayed alongside citations
- **Guest Usage**: 5 free citations without an account (browser fingerprint tracking)
- **User History**: Save, search, filter, and export citation history
- **Export Formats**: BibTeX (.bib), RIS (.ris), plain text (.txt)
- **Browser Extension**: Chrome Manifest V3 extension for one-click citations
- **Admin Dashboard**: User management, citation stats, daily chart
- **Dark Mode**: System-aware with manual toggle

## Browser Extension

The Chrome extension is in the `/extension` folder. To install:

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the `/extension` folder

## Admin Account

Default admin credentials (seeded via `npm run db:seed`):
- Email: `admin@citeout.com`
- Password: `CiteOut@Admin2026`

---

© 2026 [Eng. Mohammad Alghweri](https://www.malghweri.site). All rights reserved.
