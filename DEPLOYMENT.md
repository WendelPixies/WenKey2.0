# Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- Docker installed
- Supabase project created
- Environment variables ready

## Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Required variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key

## Building with Docker

### Option 1: Using .env file

If you have a `.env` file, Docker will automatically use it:

```bash
docker build -t wenkey .
```

### Option 2: Passing variables directly

You can pass environment variables as build arguments:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key \
  -t wenkey .
```

### Option 3: Using docker-compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  wenkey:
    build:
      context: .
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
    ports:
      - "80:80"
```

Then run:

```bash
docker-compose up -d
```

## Running the Container

```bash
docker run -d -p 80:80 --name wenkey-app wenkey
```

## Supabase Configuration

### Important Settings

In your Supabase Dashboard → Authentication → URL Configuration:

1. **Site URL**: Set to your production domain
   - Example: `https://wenkey.app`
   - **Important**: No trailing slash!

2. **Redirect URLs**: Add your production domain
   - Example: `https://wenkey.app/**`

### Testing Authentication

After deployment, open the browser console and check for:
- ✅ `Supabase URL configured: true`
- ✅ `Supabase Key configured: true`
- ✅ `getSession() completed in XXXms`

If you see:
- ❌ `CRITICAL: Supabase environment variables are missing!`

Then the build arguments were not passed correctly.

## Troubleshooting

### Auth initialization timeout

If you see "Auth initialization timed out" in the console:

1. Check that environment variables are set correctly
2. Verify Supabase URL configuration matches your domain
3. Check browser console for detailed logs
4. Verify network requests to Supabase are not blocked

### CORS errors

If you see CORS errors:
- Ensure your domain is added to Supabase Redirect URLs
- Check that Site URL matches exactly

### Variables not loading

If environment variables are undefined in production:
- Verify build arguments were passed during `docker build`
- Check that variables start with `VITE_` prefix
- Rebuild the Docker image with correct arguments
