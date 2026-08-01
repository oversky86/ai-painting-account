# account-web deploy (Period 1 — Vercel URL)

## 1. Create Vercel project

- Root directory: `app/account-web`
- Framework: Next.js
- After first deploy, copy the `*.vercel.app` URL into:
  - Theme setting **Account web URL** (`settings.account_web_url`)
  - `ACCOUNT_WEB_URL` env on this project
  - `shopify.app.toml` → `[customer_authentication].redirect_uris`
  - `extensions/piktura-order-status/src/OrderStatusBlock.jsx` constant `ACCOUNT_WEB_URL`

## 2. Environment variables (account-web)

| Name | Notes |
| --- | --- |
| `ACCOUNT_WEB_URL` | `https://<project>.vercel.app` |
| `SHOPIFY_STORE_DOMAIN` | e.g. `store.myshopify.com` |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | App / Customer Account API client id |
| `SESSION_SECRET` | ≥32 random chars |
| `ACCOUNT_HMAC_SECRET` | Shared with app |
| `APP_WRITE_API_URL` | `https://pet-paiting-app.vercel.app` |
| `STOREFRONT_URL` | Primary storefront origin |
| `NATIVE_ACCOUNT_URL` | `https://shopify.com/<shopId>/account` |
| `NATIVE_ACCOUNT_PROFILE_URL` | `https://shopify.com/<shopId>/account/profile` |

## 3. Environment variables (ecommerce-pet-app)

| Name | Notes |
| --- | --- |
| `ACCOUNT_HMAC_SECRET` | Same as account-web |
| `ACCOUNT_WRITE_SHOP` | Shop domain for `unauthenticated.admin` |

## 4. Shopify app config

```toml
[customer_authentication]
redirect_uris = [ "https://<project>.vercel.app/api/auth/callback" ]
```

Then `shopify app deploy` for remaining extensions (checkout / customization / order-status).

## 5. Acceptance

- Mobile 390×844, desktop 1440×900, ultra-wide 2560 / 3840
- Review modal: desktop hover-zoom vs mobile fullscreen preview (separate trees)
- Guest → storefront login → `/pages/account` → redirect to account-web `/orders`
- Sign out clears account-web session and returns toward storefront logout

## Deferred

See [DEFERRED_SUBDOMAIN_DNS.md](./DEFERRED_SUBDOMAIN_DNS.md).
