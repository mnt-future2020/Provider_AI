# Quick Setup Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Your `.env` file already has most settings. Just verify:

```env
COMPOSIO_API_KEY=ak_ua0FOi_rUVSnDD67weQO  ✅ Already set
OPENAI_API_KEY=sk-proj-...                 ✅ Already set
AUTH_SECRET=r+wAOLNZhoC1WB/...             ✅ Already set
```

### Step 3: Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📱 How to Use

### 1. Login
- Go to http://localhost:3000
- You'll be redirected to `/login`
- Enter any name and email (demo mode)
- Click "Sign in"

### 2. Connect Your Apps
- Click "Connections" button in header
- Choose an app (GitHub, Gmail, Slack, etc.)
- Click "Connect"
- Complete OAuth in the popup window
- See "Connected" status appear

### 3. Start Automating
- Go back to main page
- Type commands like:
  - "Star the composio/composio repository"
  - "Send an email to test@example.com saying hello"
  - "Create a calendar event tomorrow at 3pm"
- Watch the AI execute tasks using your connected apps!

---

## 🔧 What's Been Implemented

### ✅ Authentication System
- JWT-based sessions
- HTTP-only cookies
- Login/logout functionality
- Protected routes

### ✅ Connections Management
- Connect apps via OAuth
- Disconnect apps
- View connection status
- Multiple accounts support

### ✅ AI Chat Interface
- Clean, professional UI
- Real-time streaming responses
- Tool execution visibility
- User-specific context

### ✅ Composio Integration
- User entity management
- Connected accounts API
- Tool execution with user context
- Automatic token refresh

---

## 🎯 Key Features

1. **User Isolation**: Each user has their own connections
2. **Multiple Accounts**: Connect work + personal accounts
3. **Secure**: No credentials stored in frontend
4. **Professional UI**: Clean white theme, minimal design
5. **Real-time**: See tools being executed live

---

## 📂 File Structure

```
app/
├── api/
│   ├── auth/              # Login, logout, session
│   ├── chat/              # AI chat with tools
│   └── connections/       # Connect/disconnect apps
├── connections/           # Connections management page
├── login/                 # Login page
└── page.tsx              # Main chat interface

lib/
├── auth.ts               # Authentication utilities
└── composio.ts           # Composio SDK functions
```

---

## 🔐 Security Notes

- Sessions expire after 7 days
- Cookies are HTTP-only (not accessible via JavaScript)
- Each user's data is isolated via Composio entities
- OAuth tokens managed securely by Composio
- No sensitive data in frontend

---

## 🐛 Common Issues

### "Unauthorized" in chat
**Solution**: Make sure you're logged in. Check `/api/auth/me`

### Connection not showing
**Solution**: Wait 3-5 seconds after OAuth, then refresh

### Tool execution fails
**Solution**: Verify app is connected in Connections page

---

## 🎨 Design Philosophy

- **Clean**: No unnecessary elements
- **Professional**: Business tool, not AI chatbot
- **Minimal**: White theme, simple borders
- **Functional**: Every element serves a purpose

---

## 📚 Next Steps

1. **Test the flow**: Login → Connect GitHub → Ask to star a repo
2. **Add more apps**: Connect Gmail, Slack, Calendar
3. **Try multiple accounts**: Connect 2 Gmail accounts
4. **Explore tools**: Ask AI what it can do

---

## 💡 Tips

- Use natural language: "Send email to john@example.com"
- Be specific: Include repo names, email addresses, etc.
- Check connections first: Make sure apps are connected
- Multiple accounts: Most recent connection is used by default

---

## 🚀 Ready to Deploy?

### Vercel Deployment

1. Push to GitHub
2. Import in Vercel
3. Add environment variables:
   - `COMPOSIO_API_KEY`
   - `OPENAI_API_KEY`
   - `AUTH_SECRET`
4. Deploy!

---

**You're all set! Start the dev server and begin automating! 🎉**
