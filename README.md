# ViewBrush account-web

Headless Customer Account UI (My Orders / Payment Status / My Account), deployed on Vercel.

- Production: https://ai-painting-account.vercel.app
- Repo: https://github.com/oversky86/ai-painting-account (`master` → Vercel Production)
- Local: `npm run dev` → http://127.0.0.1:3100
- Env template: `.env.example`
- Ship notes: [DEPLOY.md](./DEPLOY.md)
- Deferred subdomain DNS: [DEFERRED_SUBDOMAIN_DNS.md](./DEFERRED_SUBDOMAIN_DNS.md)

Login uses Shopify hosted Customer Account OAuth (PKCE). Profile edits deep-link to native Shopify account pages.
