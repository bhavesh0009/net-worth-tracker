# WealthTrack - Personal Net Worth Tracker

A modern, secure web application for tracking personal net worth over time. Built with Next.js, BigQuery, and Google OAuth.

## Features

- 📊 **Interactive Dashboard** - Visualize your wealth trend with beautiful charts
- 📈 **Net Worth Velocity** - Track monthly changes in your net worth
- 🎯 **Asset Allocation** - See how your assets are distributed across categories
- 📸 **Monthly Snapshots** - Record account balances each month
- 🔐 **Secure Authentication** - Google OAuth integration
- 📱 **Responsive Design** - Works perfectly on mobile and desktop
- ☁️ **Cloud-Based** - Data stored securely in Google BigQuery

## Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Charts:** Recharts
- **Authentication:** NextAuth.js with Google OAuth
- **Database:** Google BigQuery
- **Hosting:** Vercel
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Platform account
- BigQuery dataset created
- Google OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bhavesh0009/net-worth-tracker.git
cd net-worth-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret # Generate with: openssl rand -base64 32

# Google Cloud BigQuery
GCP_PROJECT_ID=your_gcp_project_id
GCP_DATASET_ID=your_dataset_id

# Service Account Credentials (JSON as single line)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account"...}

# Allowed User Email (for authorization)
ALLOWED_EMAIL=your_email@gmail.com
```

### Setting Up Google Cloud

1. **Create a GCP Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project

2. **Enable BigQuery API:**
   - Enable BigQuery API for your project

3. **Create a BigQuery Dataset:**
   - Create a dataset (e.g., `net_worth_tracker`)

4. **Set up OAuth 2.0:**
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - For production, add: `https://your-domain.vercel.app/api/auth/callback/google`

5. **Create Service Account:**
   - Create a service account with BigQuery Admin role
   - Download JSON key

### Database Schema

The application uses three main tables in BigQuery:

- **accounts** - Financial accounts (assets & liabilities)
- **periods** - Monthly snapshots
- **records** - Account balances for each period

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Setting Up Accounts

Use the provided script to set up your accounts:

```bash
npm run setup-accounts
```

## Deployment

This app is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Update `NEXTAUTH_URL` to your production URL
5. Update Google OAuth redirect URIs

## Usage

1. **Sign In** - Authenticate with your Google account
2. **Set Up Accounts** - Add your financial accounts (banks, investments, etc.)
3. **Create Snapshots** - Monthly updates of account balances
4. **View Dashboard** - Track your wealth growth over time

## Security

- All sensitive data is gitignored (`.env.local`, credentials)
- Google OAuth for authentication
- Single user access (configurable via `ALLOWED_EMAIL`)
- Service account for secure BigQuery access

## License

MIT License - feel free to use this for your personal finance tracking!

## Contributing

This is a personal project, but suggestions and feedback are welcome via issues.

---

**Note:** This application handles sensitive financial data. Never commit your `.env.local` file or any credentials to version control.
