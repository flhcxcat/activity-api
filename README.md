# Activity Status API

A simple Vercel Serverless API for storing and retrieving your current activity status.

## Features

- 📊 Store current app/activity status in Redis
- 🔄 Auto-expire after 10 minutes of inactivity
- 🔒 API key authentication for posting
- 🌐 CORS enabled for frontend access

## Quick Start

### 1. Create Upstash Redis Database (Free)

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database (free tier)
3. Get `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the database details

### 2. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/flhcxcat/activity-api)

Or manually:

1. Fork/clone this repository
2. Import to Vercel
3. Add environment variables in Vercel dashboard:
   - `UPSTASH_REDIS_REST_URL` - Your Redis REST URL (with https://)
   - `UPSTASH_REDIS_REST_TOKEN` - Your Redis REST Token
   - `API_SECRET` - Create a secret key for API authentication

### 3. Configure Your Blog

Update the API URL in your blog's frontend code:

```javascript
const ACTIVITY_API_URL = 'https://your-project.vercel.app/api/activity';
```

### 4. Run the Reporter Script

Edit `activity-reporter.ps1` and set your configuration:

```powershell
$API_URL = "https://your-project.vercel.app/api/activity"
$API_SECRET = "your-api-secret"  # Same as Vercel env var
```

Then run:

```powershell
.\activity-reporter.ps1
```

## API Endpoints

### GET /api/activity

Get current activity status.

**Response:**
```json
{
  "app": "VS Code",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

### POST /api/activity

Report current activity (requires authentication).

**Headers:**
- `Authorization: Bearer your-api-secret`
- `Content-Type: application/json`

**Body:**
```json
{
  "app": "VS Code"
}
```

### GET /api/health

Health check endpoint to verify configuration.

**Response:**
```json
{
  "status": "ok",
  "message": "All systems operational",
  "checks": {
    "envVars": { "status": "pass" },
    "redis": { "status": "pass" }
  }
}
```

## Local Development

```bash
# Install dependencies
npm install

# Check database connection
npm run check-db

# Run local dev server (requires Vercel CLI)
npm run dev
```

## Troubleshooting

### API returns 404
- Ensure you deployed to Vercel correctly
- Check that `api/activity.js` and `api/health.js` exist
- Try redeploying from Vercel dashboard

### Redis connection fails
- Verify `UPSTASH_REDIS_REST_URL` includes `https://`
- Check that `UPSTASH_REDIS_REST_TOKEN` is correct
- Visit `/api/health` to debug

### PowerShell script fails
- Ensure `$API_SECRET` matches Vercel environment variable
- Check network/firewall settings
- Verify API URL is correct

## Privacy

The reporter script includes:
- **Blacklist**: Apps that won't be reported (Settings, Task Manager, etc.)
- **Name mapping**: Clean up process names for display

Edit `$BLACKLIST` and `$APP_NAME_MAP` in `activity-reporter.ps1` to customize.

## License

MIT
