# ADApolis Deployment Guide

**Last updated:** 2026-06-04

This document describes how to deploy ADApolis to Railway and connect the custom domain.

---

## Prerequisites

- GitHub repository with ADApolis code pushed to main branch
- Railway account (free tier has $5/month credit, sufficient for MVP)
- Domain adapolis.net registered and accessible for DNS updates
- All environment variables ready to configure

---

## Railway Deployment Steps (Manual)

### 1. Connect GitHub Repository to Railway

1. Go to [railway.app](https://railway.app/) and sign in with GitHub
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub account
5. Search for and select the `adapolis` repository
6. Click "Deploy Now"

**Railroad will automatically:**
- Detect Next.js 14
- Use the `railway.json` configuration for build/start commands
- Build using NIXPACKS builder
- Deploy to Railway infrastructure

### 2. Configure Environment Variables

Once the project is created in Railway, go to the **Variables** tab and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
NEXT_PUBLIC_APP_URL=https://adapolis.net
CRON_SECRET=your-secret-cron-token-here
```

**Important:**
- The `SUPABASE_SERVICE_ROLE_KEY` is **server-side only** — Railway's deployment environment is server-side, so this is safe
- The `NEXT_PUBLIC_*` variables are publicly visible (that's intentional — Supabase anon key is public)
- Set `NEXT_PUBLIC_APP_URL` to your production domain once DNS is configured

### 3. Verify Initial Deployment

1. After environment variables are saved, Railway automatically triggers a rebuild
2. Go to the **Deployments** tab and watch the build progress
3. Once complete, you'll see a **Generated Domain** like `adapolis-production.up.railway.app`
4. Click the domain to verify the homepage loads (shows "ADApolis — The civic engine for Cardano governance")

### 4. Connect Custom Domain (adapolis.net)

1. In Railway, go to **Settings** → **Networking**
2. Under "Custom Domain", enter: `adapolis.net`
3. Railway will display a **CNAME record** to add to your DNS

**Example CNAME record:**
```
Host: adapolis
Type: CNAME
Value: adapolis-production.up.railway.app (or whatever Railway displays)
TTL: 3600 (or your registrar's default)
```

5. Add the CNAME record to your domain registrar's DNS settings (GoDaddy, Namecheap, etc.)
6. Wait 5-30 minutes for DNS propagation (check with `nslookup adapolis.net` or similar)
7. Once DNS is live, Railway automatically provisions a TLS certificate via Let's Encrypt
8. Visit `https://adapolis.net` to verify

### 5. Enable Auto-Deployment

By default, Railway deploys automatically whenever you push to `main`. To verify this is enabled:

1. In Railway, go to **Settings** → **GitHub Integration**
2. Confirm the repository is connected and auto-deploy is enabled
3. Any subsequent `git push` to `main` will trigger a new deployment

---

## Environment Variables Reference

| Variable | Source | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings | `https://xyz.supabase.co` | Public, safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API | `eyJhbGci...` | Public, safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API | `eyJhbGci...` | **Server-side only**, secret |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | `sk-ant-...` | **Secret** |
| `NEXT_PUBLIC_APP_URL` | Custom value | `https://adapolis.net` | For redirect URLs, email links, etc. |
| `CRON_SECRET` | Generate a random string | `your-secret-token` | Protects ETL endpoints from unauthorized access |

---

## Monitoring & Logs

### View Deployment Logs

1. In Railway, go to **Deployments**
2. Click the most recent deployment to see real-time build logs
3. Once deployed, click **View Logs** to see application runtime logs

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Build fails with "Cannot find module" | Missing dependency | Check `npm install` locally, commit `package-lock.json` |
| App crashes after deploy | Missing env vars | Verify all vars in Railway Variables tab match `.env.local.example` |
| Domain doesn't resolve | DNS not propagated | Wait 10-30 minutes, verify CNAME record in registrar |
| HTTPS shows error | TLS not ready | Railway provisions certs automatically; wait ~2 min after DNS setup |

### Health Check

Railway monitors the app via HTTP GET to `/` (the homepage). If this returns a non-200 status repeatedly, Railway will restart the container.

---

## Redeploying After Code Changes

After making code changes locally:

```bash
# Make changes to the code
git add -A
git commit -m "feat: description of change"
git push origin main
```

Railway automatically detects the push and:
1. Clones the updated code
2. Runs `npm run build`
3. Deploys the new container
4. Routes traffic once health checks pass

**Note:** The first deployment takes ~3-5 minutes (build + provision). Subsequent redeplooys are faster (~2-3 min).

---

## Cost Management

Railway's free tier includes $5/month credit:
- A small Next.js app (like ADApolis MVP) typically uses $1-3/month
- ETL cron jobs (Phase 1 Task 1.3+) add ~$1-2/month
- Once usage approaches $5, you'll receive alerts
- To stay within free tier: keep deployments minimal, avoid heavy compute, cache aggressively

**If approaching limit:** Upgrade to pay-as-you-go ($5/month charge, then $0.10 per GB-hour beyond that).

---

## Next Steps

1. **Phase 0 Task 0.7:** Complete the manual Railway dashboard setup (this document)
2. **Phase 0 Task 0.8:** Commit this DEPLOYMENT.md to the repo
3. **Phase 1 Task 1.1+:** Begin building the Koios API client and Scoreboard
4. **Phase 3 onwards:** Add scheduled ETL jobs as separate Railway services

---

## References

- [Railway Documentation](https://docs.railway.app/)
- [Next.js on Railway](https://docs.railway.app/guides/nextjs)
- [Railway Environment Variables](https://docs.railway.app/guides/variables)
- [Custom Domains](https://docs.railway.app/guides/custom-domains)
