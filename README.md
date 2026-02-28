# Karebe Wines & Spirits MVP

Static frontend with Vercel serverless API endpoints for admin login + seed data.

## Admin Credentials

- Username: `karebe`
- Password: `karebe1234`

## Local Run

Open `index.html` directly for static preview, or use Vercel dev to include backend routes:

```bash
vercel dev
```

Then open `http://localhost:3000`.

## Deploy To Vercel

1. Import this folder into Vercel.
2. Framework preset: `Other`.
3. Build command: leave empty.
4. Output directory: leave empty.
5. Deploy.

The frontend pages (`index.html`, `admin.html`, `rider.html`) and backend endpoints (`/api/*`) will deploy together.

## API Endpoints

- `POST /api/admin/login`
- `GET /api/seed`

