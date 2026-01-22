# NextAuth v5 Production Setup - Complete ✅

## What Was Done

### 1. **Database Setup with Prisma**
- ✅ Installed Prisma and Prisma Adapter
- ✅ Created database schema with User, Account, Session, VerificationToken models
- ✅ Ran migrations to sync with PostgreSQL (Neon)
- ✅ Created Prisma singleton client

### 2. **NextAuth Configuration**
- ✅ Created `auth.ts` with Google OAuth provider
- ✅ JWT session strategy (7 days expiry)
- ✅ Custom callbacks to include user ID in session
- ✅ Custom login page at `/login`

### 3. **Middleware Protection**
- ✅ Created `middleware.ts` to protect routes
- ✅ Auto-redirect to login if unauthenticated
- ✅ Protected routes: `/`, `/connections`, `/api/chat`, `/api/connections/*`

### 4. **API Routes**
- ✅ Created `/api/auth/[...nextauth]/route.ts` for NextAuth handlers
- ✅ Updated existing auth routes (login/logout) to deprecate old system

### 5. **Frontend Updates**
- ✅ Updated `app/layout.tsx` with SessionProvider
- ✅ Replaced login page with Google OAuth button
- ✅ Updated home page to use `useSession()` hook
- ✅ Updated connections page with session management
- ✅ Replaced manual logout with NextAuth's `signOut()`

### 6. **Type Definitions**
- ✅ Created `types/next-auth.d.ts` to extend NextAuth types with user ID

### 7. **Auth Library Migration**
- ✅ Updated `lib/auth.ts` to use NextAuth's `auth()` function
- ✅ Removed custom JWT logic (jose library)
- ✅ Simplified to single `getSession()` function

## Environment Variables Required

Create a `.env` file with these variables:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=generate_with_openssl_rand_hex_32

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Composio
COMPOSIO_API_KEY=your_composio_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

### Generate AUTH_SECRET:
```bash
openssl rand -hex 32
```

### Get Google OAuth Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret

## How It Works Now

### Login Flow:
1. User visits `/login`
2. Clicks "Continue with Google"
3. Redirected to Google OAuth consent screen
4. After approval, redirected back to app
5. NextAuth creates user in database (if new)
6. Session stored as JWT in httpOnly cookie
7. User redirected to home page

### Session Management:
- **Client-side**: Use `useSession()` hook from `next-auth/react`
- **Server-side**: Use `auth()` function from `@/auth`
- **Middleware**: Automatically protects routes

### User ID for Composio:
- Database-generated UUID (not email anymore)
- Available as `session.user.id`
- Passed to Composio: `composio.create(session.user.id)`

## Security Features

✅ **Secure cookies** - httpOnly, secure in production
✅ **CSRF protection** - Built into NextAuth
✅ **Database sessions** - User data persisted
✅ **OAuth 2.0** - Industry standard authentication
✅ **JWT signing** - Cryptographically signed tokens
✅ **Automatic token refresh** - Handled by NextAuth
✅ **Route protection** - Middleware-based

## Testing

1. Start the dev server:
```bash
npm run dev
```

2. Visit `http://localhost:3000`
3. You'll be redirected to `/login`
4. Click "Continue with Google"
5. Complete OAuth flow
6. You'll be logged in and redirected to home

## Production Checklist

- ✅ Database configured (Neon PostgreSQL)
- ✅ Google OAuth credentials set
- ✅ AUTH_SECRET generated
- ✅ NEXTAUTH_URL configured
- ⚠️ Update NEXTAUTH_URL for production domain
- ⚠️ Ensure database is production-ready
- ⚠️ Add GitHub OAuth if needed (optional)

## Adding More OAuth Providers

To add GitHub, Microsoft, etc:

1. Get OAuth credentials from provider
2. Add to `.env`:
```env
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

3. Update `auth.ts`:
```typescript
import GitHub from "next-auth/providers/github";

providers: [
  Google({ ... }),
  GitHub({
    clientId: process.env.AUTH_GITHUB_ID!,
    clientSecret: process.env.AUTH_GITHUB_SECRET!,
  }),
]
```

## Migration Notes

- Old custom JWT auth system removed
- Users will need to re-authenticate with Google
- Old session cookies will be invalid
- User IDs changed from email to UUID
- Composio connections will need to be re-linked

## Files Created/Modified

**Created:**
- `auth.ts` - NextAuth configuration
- `middleware.ts` - Route protection
- `prisma/schema.prisma` - Database models
- `prisma/prisma.ts` - Prisma client
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API route
- `types/next-auth.d.ts` - Type definitions
- `NEXTAUTH_SETUP.md` - This file

**Modified:**
- `lib/auth.ts` - Simplified to use NextAuth
- `app/layout.tsx` - Added SessionProvider
- `app/page.tsx` - Use useSession hook
- `app/login/page.tsx` - Google OAuth button
- `app/connections/page.tsx` - Session management
- `app/api/auth/login/route.ts` - Deprecated
- `app/api/auth/logout/route.ts` - Deprecated

## Support

For NextAuth documentation: https://authjs.dev
For Prisma documentation: https://www.prisma.io/docs
