# Daymark

A multi-user daily project desk built with Next.js, Clerk, Prisma, and PostgreSQL.

## Local setup

1. Create a Clerk application and copy its publishable and secret keys.
2. Create a PostgreSQL service on Railway and copy its public connection URL.
3. Copy the environment template and fill in the values:

```bash
cp .env.example .env
```

4. Create the database tables and run the app:

```bash
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Clerk protects application and API routes. Each database query is scoped to the authenticated Clerk user.

The dashboard requires Clerk and PostgreSQL configuration. It does not display sample account data when these services are missing.

## Railway deployment

1. Add this repository as a Railway service.
2. Add a PostgreSQL service to the same project.
3. Set all variables from `.env.example` in the web service.
4. Use `npm run build` as the build command and `npm run start` as the start command.
5. Run `npx prisma migrate deploy` against the production database.

### Todo push reminders

1. Run `npm run push:keys` once and copy the VAPID variables to Railway.
2. Set the VAPID variables, `CRON_SECRET`, and the public `APP_URL`.
3. Add a Railway worker service from the same repository with `npm run reminders:watch` as its start command. It checks every 30 seconds by default.
4. In the app, click **Enable notifications** (on iPhone, install via Share → Add to Home Screen first).

Email reminders via Resend remain optional and are disabled unless `REMINDER_EMAIL_ENABLED=true` and a verified Resend domain are configured.

The worker calls the protected reminder endpoint, which only processes todos that are still pending. Push delivery is tracked per todo to prevent duplicate reminders.

Daymark includes a web app manifest and service worker. Android users can install it from the browser install prompt. On iPhone, use Safari’s Share → Add to Home Screen; iOS web push permission can only be requested from the installed Home Screen app.

## Current data flow

- Clerk authenticates and identifies each user.
- The first authenticated request syncs that user into PostgreSQL.
- A starter project is created for new accounts.
- Today’s tasks load from PostgreSQL and status changes persist through authenticated API routes.
- Personal todos and their reminder status are stored per user in PostgreSQL.
