# Lodga

**Your space, sorted.**

Lodga is a student accommodation discovery platform being developed for students around the Federal University of Technology, Minna (FUTMINNA). It helps students explore lodge options on a map, compare important details, and find accommodation information in one place.

The project is being built as a full-stack web application, with separate experiences for students, caretakers, and administrators.

> **Project status:** In active development. Some workflows and integrations may still use test or simulated data. Do not treat demo listings, payment flows, or verification statuses as real-world guarantees.

## What Lodga is designed to do

- **Explore accommodation on a map** and identify where properties are located.
- **Compare listings** using details such as lodge name, rent, accommodation type, facilities, and availability.
- **Support students** as they discover options and follow up on properties.
- **Give caretakers a way to manage listings**, including updating property information and availability.
- **Give administrators oversight** of listings and their current status.
- **Make information clearer** by presenting property details and charges transparently.

Features available in the current build may differ from this intended product scope. Production use depends on completing and verifying the relevant backend, security, data, and third-party integrations.

## Technology

The repository currently uses:

- **React 19 + TypeScript** for the user interface
- **Vite 6** for frontend development and bundling
- **Express** for the application server and API routes
- **Supabase JS** and PostgreSQL-related tooling for data integration
- **Google Maps React libraries** for map functionality
- **Tailwind CSS 4** for styling
- **Lucide React** for icons

## Getting started

### Requirements

- Node.js (use a current LTS release)
- npm
- Access to any external services required by the features you want to run, such as Google Maps or Supabase

### 1. Clone the repository

```bash
git clone https://github.com/Hacker-Dark/lodgatest01.git
cd lodgatest01
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local environment file from the example:

**macOS / Linux**
```bash
cp .env.example .env
```

**Windows PowerShell**
```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in the values required by the features you are using. The example file documents the available settings, including:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini API access, if used |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-side Supabase access; keep secret |
| `DATABASE_URL` | PostgreSQL connection string, if required by the configured backend |
| `JWT_SECRET` | Server-side signing secret for JWT-based authentication |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps browser key; restrict it in Google Cloud |
| `GOOGLE_MAPS_API_KEY_ANDROID` / `GOOGLE_MAPS_API_KEY_IOS` | Platform-specific map keys, if applicable |
| `APP_URL` | Base URL used by the app in hosted environments |
| `VITE_SUPPORT_PHONE_1`, `VITE_SUPPORT_PHONE_2`, `VITE_SUPPORT_EMAIL` | Support contact details |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics measurement ID, if analytics is enabled |

Only configure values for integrations that are actually enabled. Never commit `.env`, API secrets, service-role keys, database credentials, or JWT secrets to GitHub. Frontend variables prefixed with `VITE_` are exposed to the browser and must not contain private secrets.

### 4. Start the development server

```bash
npm run dev
```

The Express server is configured to listen on port **3000**. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Express server with Vite development middleware |
| `npm run build` | Builds the frontend and bundles the server for production |
| `npm start` | Runs the bundled production server from `dist/server.cjs` |
| `npm run lint` | Runs the TypeScript compiler without emitting files |
| `npm run clean` | Removes the `dist` build directory |

Run the build and type check before deploying:

```bash
npm run lint
npm run build
```

## Repository layout

```text
.
├── backend/
│   └── src/          # API routes, data access, jobs, and backend logic
├── shared/            # Shared schemas and validators
├── src/
│   ├── components/   # Reusable UI components
│   ├── lib/          # Client-side helpers and integrations
│   ├── App.tsx       # Main application UI
│   └── main.tsx      # Frontend entry point
├── server.ts          # Express server and API registration
├── .env.example       # Environment-variable template
├── package.json       # Scripts and dependencies
└── vite.config.ts     # Vite configuration
```

## API areas

The Express server registers API routes for:

- Authentication — `/api/auth`
- Listings — `/api/listings`
- Transactions — `/api/transactions`
- Caretaker workflows — `/api/caretaker`
- Administration — `/api/admin`
- Reports — `/api/reports`

The current server also contains simulator endpoints for testing selected database and scheduled-job workflows. Treat simulator routes and payment-callback behavior as development tooling, not as a production payment system.

## Data, security, and production readiness

Lodga is intended to handle property information and different user roles, so security and data accuracy matter.

Before using the application with real users or transactions, verify that:

- Authentication and role permissions are enforced by the server and database, not only by the interface.
- Supabase Row Level Security and storage policies are configured where applicable.
- Real listing data is separated from seed or demonstration data.
- Google Maps API keys are restricted to the appropriate applications and APIs.
- Payment processing is connected to a verified provider flow; a simulator is not proof of a successful payment.
- Listing verification and availability dates reflect actual checks.
- Personal data is collected only when needed and is protected appropriately.
- Production CORS rules, error handling, logging, backups, and deployment secrets are configured for the target environment.

A listing appearing on Lodga does not, by itself, guarantee that a property is safe, available, or legally authorized for rent. Students should confirm details with the responsible property representative before making commitments or payments.

## Contributing

For changes to the application:

1. Create a branch for your work.
2. Keep credentials and real user data out of commits.
3. Run `npm run lint` and `npm run build`.
4. Describe the change and any environment or database updates in your pull request.

## Project

Lodga — student accommodation discovery, starting around FUTMINNA in Minna, Niger State, Nigeria.

**Tagline:** Your space, sorted.
