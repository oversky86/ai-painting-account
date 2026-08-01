# account-web deploy (Period 1 — Vercel URL)

## 1. Create Vercel project

- Root directory: `app/account-web`
- Framework: Next.js
- After first deploy, copy the `*.vercel.app` URL into:
  - Theme setting **Account web URL** (`settings.account_web_url`) — same URL for both shops
  - `ACCOUNT_WEB_URL` env on this project
  - `shopify.app.toml` + `shopify.app.production.toml` → `[customer_authentication].redirect_uris`
  - `extensions/piktura-order-status/src/OrderStatusBlock.jsx` constant `ACCOUNT_WEB_URL`

Theme links append `?shop={{ shop.permanent_domain }}` so one account-web host can serve **dev + prod**.

## 2. Environment variables (account-web)

| Name | Notes |
| --- | --- |
| `ACCOUNT_WEB_URL` | `https://ai-painting-account.vercel.app` |
| `ACCOUNT_SHOPS` | JSON array of shops (see `.env.example`) — **required for dual-shop** |
| `SESSION_SECRET` | ≥32 random chars |
| `ACCOUNT_HMAC_SECRET` | Shared with app |
| `APP_WRITE_API_URL` | `https://pet-paiting-app.vercel.app` |

### `ACCOUNT_SHOPS` example

```json
[
  {
    "storeDomain": "w4yzmt-vv.myshopify.com",
    "clientId": "95a4a9972a0fc9d0d899293e2b62644f",
    "storefrontUrl": "https://w4yzmt-vv.myshopify.com",
    "nativeAccountUrl": "https://shopify.com/<prodShopId>/account",
    "nativeAccountProfileUrl": "https://shopify.com/<prodShopId>/account/profile"
  },
  {
    "storeDomain": "e-commerce-dev-v6yidmlw.myshopify.com",
    "clientId": "8f74713e6783c3adeb81b302e8e95866",
    "storefrontUrl": "https://e-commerce-dev-v6yidmlw.myshopify.com",
    "nativeAccountUrl": "https://shopify.com/96406864056/account",
    "nativeAccountProfileUrl": "https://shopify.com/96406864056/account/profile"
  }
]
```

First entry is the default when `?shop=` is missing. Keep **prod first** in Production.

Legacy single-shop vars (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`, …) still work if `ACCOUNT_SHOPS` is unset.

## 3. Environment variables (ecommerce-pet-app)

| Name | Notes |
| --- | --- |
| `ACCOUNT_HMAC_SECRET` | Same as account-web |
| `ACCOUNT_WRITE_SHOPS` | Comma-separated allowlist, e.g. `w4yzmt-vv.myshopify.com,e-commerce-dev-v6yidmlw.myshopify.com` |

(`ACCOUNT_WRITE_SHOP` still works as a single-shop fallback.)

## 4. Shopify app config

Both app configs need the same callback:

```toml
[customer_authentication]
redirect_uris = [ "https://ai-painting-account.vercel.app/api/auth/callback" ]
```

Then `shopify app deploy` for each config.

## 5. Acceptance

- From **dev** storefront → `/orders?shop=e-commerce-dev-v6yidmlw.myshopify.com` → dev orders / native links
- From **prod** storefront → `/orders?shop=w4yzmt-vv.myshopify.com` → prod orders / native links
- Switching shops while logged in forces re-auth for the target shop
- Guest → storefront login → account page → redirect to account-web with `shop`
- Sign out clears account-web session and returns toward that shop’s storefront logout

## Deferred

See [DEFERRED_SUBDOMAIN_DNS.md](./DEFERRED_SUBDOMAIN_DNS.md).
