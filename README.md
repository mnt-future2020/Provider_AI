# iSuiteAI - Professional AI Automation Platform

A clean, professional AI-powered automation platform built with Next.js, Composio, and OpenAI. Manage your workflows with intelligent task execution across multiple integrated apps.

## Features

✅ **User Authentication** - Secure session-based authentication  
✅ **App Connections Management** - Connect/disconnect apps (GitHub, Gmail, Slack, Notion, Calendar)  
✅ **Multiple Account Support** - Connect multiple accounts per app (work + personal)  
✅ **AI-Powered Chat** - Natural language interface for task automation  
✅ **Clean Professional UI** - Minimal white theme, no AI-looking elements  
✅ **Real-time Tool Execution** - See tools being used in real-time  

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI**: OpenAI GPT-4o-mini + Vercel AI SDK
- **Integrations**: Composio (500+ apps)
- **Auth**: JWT-based sessions
- **Styling**: Inline styles (clean, minimal)
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Composio API key ([Get it here](https://app.composio.dev))
- OpenAI API key ([Get it here](https://platform.openai.com))

### Installation

1. **Clone and install dependencies**

```bash
npm install
```

2. **Configure environment variables**

Your `.env` file should have:

```env
# Composio API Key (Required)
COMPOSIO_API_KEY=your_composio_api_key

# OpenAI API Key (Required)
OPENAI_API_KEY=your_openai_api_key

# Auth Secret (Required - already set)
AUTH_SECRET=your_secret_key

# Optional: Limit tools per app
COMPOSIO_TOOLS_LIMIT=5
```

3. **Run the development server**

```bash
npm run dev
```

4. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## Usage Guide

### 1. Login

- Go to `/login`
- Enter any name and email (demo mode)
- Click "Sign in"

### 2. Connect Apps

- Click "Connections" in the header
- Choose an app to connect (GitHub, Gmail, Slack, etc.)
- Click "Connect" - a popup will open
- Complete the OAuth flow
- Return to see the connected status

### 3. Use AI Chat

- Type commands like:
  - "Star the composio/composio repository on GitHub"
  - "Send an email to john@example.com"
  - "Create a calendar event for tomorrow at 2pm"
- The AI will use your connected apps to execute tasks

### 4. Multiple Accounts

- You can connect multiple accounts for the same app
- Example: Work Gmail + Personal Gmail
- The most recent connection is used by default

### 5. Disconnect Apps

- Go to "Connections"
- Click "Disconnect" on any connected app
- Confirm the action

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   └── me/
│   │   ├── chat/          # AI chat endpoint
│   │   └── connections/   # Connection management
│   │       ├── connect/
│   │       └── disconnect/
│   ├── connections/       # Connections page
│   ├── login/            # Login page
│   └── page.tsx          # Main chat interface
├── lib/
│   ├── auth.ts           # Authentication utilities
│   └── composio.ts       # Composio SDK utilities
└── .env                  # Environment variables
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Connections

- `GET /api/connections` - List user's connected accounts
- `POST /api/connections/connect` - Initiate app connection
- `POST /api/connections/disconnect` - Disconnect an app

### Chat

- `POST /api/chat` - Send message to AI (streaming response)

## How It Works

### Authentication Flow

1. User enters name + email
2. JWT token created and stored in HTTP-only cookie
3. All API requests validate the session
4. User ID is used as Composio entity ID

### Connection Flow

1. User clicks "Connect" on an app
2. Backend calls `composio.connectedAccounts.initiate()`
3. Composio returns OAuth redirect URL
4. User completes OAuth in popup
5. Connection is stored in Composio
6. Frontend polls and updates status

### Chat Flow

1. User sends message
2. Backend validates authentication
3. Creates Composio session with user ID
4. Fetches available tools for user
5. Streams AI response with tool execution
6. Tools use user's connected accounts

## Composio Integration

### User Management

Each user has their own Composio entity:

```typescript
const session = await composio.create(user.id);
const tools = await session.tools();
```

### Connected Accounts

```typescript
// List connections
const accounts = await composio.connectedAccounts.list({
  user_ids: [userId],
});

// Initiate connection
const request = await composio.connectedAccounts.initiate({
  user_id: userId,
  toolkit: 'github',
});

// Delete connection
await composio.connectedAccounts.delete({
  connectedAccountId: connectionId,
});
```

### Multiple Accounts

```typescript
// Connect second account
await composio.connectedAccounts.initiate({
  user_id: userId,
  toolkit: 'gmail',
  allow_multiple: true,
});

// Use specific account
await composio.tools.execute('GMAIL_SEND_EMAIL', {
  user_id: userId,
  connected_account_id: accountId,
  arguments: { ... },
});
```

## Available Toolkits

- **GitHub** - Manage repositories, issues, PRs
- **Gmail** - Send and manage emails
- **Slack** - Send messages, manage channels
- **Notion** - Manage pages and databases
- **Google Calendar** - Manage events and schedules
- **And 500+ more apps via Composio**

## Security

- ✅ HTTP-only cookies for session storage
- ✅ JWT tokens with expiration
- ✅ Server-side authentication validation
- ✅ Composio handles OAuth securely
- ✅ No credentials stored in frontend
- ✅ User data isolation via Composio entities

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

1. Build: `npm run build`
2. Start: `npm start`
3. Set environment variables
4. Ensure Node.js 18+ runtime

## Troubleshooting

### "Unauthorized" error in chat

- Make sure you're logged in
- Check if session cookie exists
- Try logging out and back in

### Connection not showing as connected

- Wait a few seconds after OAuth
- Refresh the connections page
- Check Composio dashboard for connection status

### Tool execution fails

- Verify the app is connected
- Check if connection is active
- Ensure proper permissions granted during OAuth

## Development

### Adding New Toolkits

1. Add to `AVAILABLE_TOOLKITS` in `app/connections/page.tsx`
2. Composio automatically handles the rest

### Customizing UI

- All styles are inline for simplicity
- Modify styles directly in components
- Keep the clean, professional aesthetic

### Adding Features

- Authentication is handled in `lib/auth.ts`
- Composio logic is in `lib/composio.ts`
- API routes are in `app/api/`

## License

MIT

## Support

For issues or questions:
- Composio Docs: https://docs.composio.dev
- Vercel AI SDK: https://sdk.vercel.ai
- OpenAI API: https://platform.openai.com/docs

---

Built with ❤️ using Next.js, Composio, and OpenAI
