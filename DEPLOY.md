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
    "storeDomain": "6hcr01-9t.myshopify.com",
    "clientId": "a82e09b2fd0499c59c41187578e65b80",
    "storefrontUrl": "https://viewbrush.com",
    "nativeAccountUrl": "https://shopify.com/80278749322/account",
    "nativeAccountProfileUrl": "https://shopify.com/80278749322/account/profile"
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

`view-brush.myshopify.com`、`viewbrush.com` 和 `www.viewbrush.com` 都解析到线上店这一条。代码里已经带了同一条内置配置；Vercel 上的 `ACCOUNT_SHOPS` 仍应改成上面的 JSON，并去掉旧店 `w4yzmt-vv.myshopify.com` 和旧 client id `95a4a997…`。不要把 API secret 写进这个 JSON。

First entry is the default when `?shop=` is missing. Keep **prod first** in Production.

Legacy single-shop vars (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`, …) still work if `ACCOUNT_SHOPS` is unset.

## 3. Environment variables (ecommerce-pet-app)

| Name | Notes |
| --- | --- |
| `ACCOUNT_HMAC_SECRET` | Same as account-web |
| `ACCOUNT_WRITE_SHOPS` | Optional. Code already allows the dev store and `6hcr01-9t.myshopify.com`. Remove `w4yzmt-vv.myshopify.com` if it is still set. |
| `SHOPIFY_API_SECRET_LIVE` | Secret for `ecommerce-pet-app-prod`. Do not commit it. App proxy also accepts it beside `SHOPIFY_API_SECRETS`. |
| `SHOPIFY_API_KEY_LIVE` | Optional. Defaults to `a82e09b2fd0499c59c41187578e65b80`. |

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
- From **live** storefront → `/orders?shop=6hcr01-9t.myshopify.com` or `?shop=viewbrush.com` → live orders / native links

## 6. 新店上线还要做的操作

主题代码只在 `oil-painting` 的 `develop`。不要新建分支，也不要把这次改动合并进 `main`。线上店先不要接 GitHub 主题，也不要 `theme push` 到 `6hcr01-9t`。

应用不按店铺拆 git 分支。pet 和供应商推 `main`，selling plan 推 `master`，account-web 先上 `develop` 预览。`shopify app deploy --config production` 只是 Shopify 配置名。

1. 在新店自己的 Dev Dashboard 里，给 `ecommerce-pet-app-prod` 和 `custom-selling-plan-prod` 各发一版：App URL 分别是 `https://pet-paiting-app.vercel.app` 和 `https://custom-selling-plan.vercel.app`，scopes 与对应的 `shopify.app.production.toml` 一致。然后 Install app 装到 `6hcr01-9t`，各打开一次嵌入式后台。
2. 也可以在应用目录执行 `shopify app deploy --config production`。Client secret 只放进对应 Vercel 的 `SHOPIFY_API_SECRET_LIVE`，不要发在聊天里。selling plan 的 Vercel 项目用自己的 secret，变量名相同。
3. 商品套用当前主题的商品模板。首页创建链接在线上店应进入 `/products/custom-oil-portrait`。
4. 在新店的 selling plan 应用里重建付款方案，绑到 Custom Oil Portrait，并在 Payments 里激活付款定制。
5. 供应商工作台登录后可以在订单列表切换开发店和线上店。

旧店 `w4yzmt-vv` 和旧应用 `ai-painting` 不再使用。checkout-ui-custom 这次不部署。
- Switching shops while logged in forces re-auth for the target shop
- Guest → storefront login → account page → redirect to account-web with `shop`
- Sign out clears account-web session and returns toward that shop’s storefront logout

## Deferred

See [DEFERRED_SUBDOMAIN_DNS.md](./DEFERRED_SUBDOMAIN_DNS.md).
