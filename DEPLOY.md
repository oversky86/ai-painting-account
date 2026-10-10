# account-web 部署（第一阶段 — Vercel 地址）

## 1. 创建 Vercel 项目

- 根目录：`app/account-web`
- 框架：Next.js
- 第一次部署后，把 `*.vercel.app` 地址填到：
  - 主题设置 **Account web URL**（`settings.account_web_url`）——两家店用同一个地址
  - 本项目的环境变量 `ACCOUNT_WEB_URL`
  - `shopify.app.toml` 和 `shopify.app.production.toml` 的 `[customer_authentication].redirect_uris`
  - `extensions/piktura-order-status/src/OrderStatusBlock.jsx` 里的常量 `ACCOUNT_WEB_URL`

主题链接使用 `?shop=dev` 或 `?shop=prod`，不写 Shopify 店铺域名。一个 account-web 地址可以同时服务开发店和线上店。

## 2. 环境变量（account-web）

| 名称 | 说明 |
| --- | --- |
| `ACCOUNT_WEB_URL` | `https://ai-painting-account.vercel.app` |
| `ACCOUNT_SHOPS` | 店铺 JSON 数组（见 `.env.example`）。两家店都要配 |
| `SESSION_SECRET` | 至少 32 位随机字符 |
| `ACCOUNT_HMAC_SECRET` | 与 pet 应用相同 |
| `APP_WRITE_API_URL` | `https://pet-paiting-app.vercel.app` |

### `ACCOUNT_SHOPS` 示例

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

`view-brush.myshopify.com`、`viewbrush.com` 和 `www.viewbrush.com` 都解析到线上店这一条。代码里已经带了同一条内置配置。Vercel 上的 `ACCOUNT_SHOPS` 仍应改成上面的 JSON，并去掉旧店 `w4yzmt-vv.myshopify.com` 和旧 client id `95a4a997…`。不要把 API secret 写进这个 JSON。

没有 `?shop=` 时用数组的第一项。生产环境把线上店放在第一项。

旧的单店变量（`SHOPIFY_STORE_DOMAIN`、`SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` 等）在未设置 `ACCOUNT_SHOPS` 时仍然可用。

## 3. 环境变量（ecommerce-pet-app）

| 名称 | 说明 |
| --- | --- |
| `ACCOUNT_HMAC_SECRET` | 与 account-web 相同 |
| `ACCOUNT_WRITE_SHOPS` | 可选。代码已经允许开发店和 `6hcr01-9t.myshopify.com`。如果还留着 `w4yzmt-vv.myshopify.com`，删掉 |
| `SHOPIFY_API_SECRET_LIVE` | `ecommerce-pet-app-prod` 的 secret。不要提交到仓库。App Proxy 会把它和 `SHOPIFY_API_SECRETS` 一起用来验签 |
| `SHOPIFY_API_KEY_LIVE` | 可选。默认是 `a82e09b2fd0499c59c41187578e65b80` |

`ACCOUNT_WRITE_SHOP` 仍可作为单店回退。

## 4. Shopify 应用配置

两个应用配置都要有同一个回调：

```toml
[customer_authentication]
redirect_uris = [ "https://ai-painting-account.vercel.app/api/auth/callback" ]
```

然后对每个配置执行 `shopify app deploy`。

## 5. 验收

- 从开发店店面进入 `/orders?shop=dev`，应看到开发店订单和该店的客户账户链接
- 从线上店店面进入 `/orders?shop=prod`，应看到线上店订单和该店的客户账户链接
- 已登录时切换店铺，会按目标店重新登录
- 访客从店面登录进入账户页后，会带着 `shop` 跳到 account-web
- 退出登录会清掉 account-web 会话，并回到该店的店面登出

## 6. 新店上线还要做的操作

主题代码只在 `oil-painting` 的 `develop`。不要新建分支，也不要把这次改动合并进 `main`。线上店先不要接 GitHub 主题，也不要 `theme push` 到 `6hcr01-9t`。

应用不按店铺拆 git 分支。pet 和供应商推 `main`，selling plan 推 `master`，account-web 先上 `develop` 预览。`shopify app deploy --config production` 只是 Shopify 配置名。

1. 在新店自己的 Dev Dashboard 里，给 `ecommerce-pet-app-prod` 和 `custom-selling-plan-prod` 各发一版：App URL 分别是 `https://pet-paiting-app.vercel.app` 和 `https://custom-selling-plan.vercel.app`，scopes 与对应的 `shopify.app.production.toml` 一致。然后 Install app 装到 `6hcr01-9t`，各打开一次嵌入式后台。
2. 也可以在应用目录执行 `shopify app deploy --config production`。Client secret 只放进对应 Vercel 的 `SHOPIFY_API_SECRET_LIVE`，不要发在聊天里。selling plan 的 Vercel 项目用自己的 secret，变量名相同。
3. 商品套用当前主题的商品模板。首页创建链接在线上店应进入 `/products/custom-oil-portrait`。
4. 在新店的 selling plan 应用里重建付款方案，绑到 Custom Oil Portrait，并在 Payments 里激活付款定制。
5. 供应商工作台登录后可以在订单列表切换开发店和线上店。

旧店 `w4yzmt-vv` 和旧应用 `ai-painting` 不再使用。checkout-ui-custom 这次不部署。

## 延后

见 [DEFERRED_SUBDOMAIN_DNS.md](./DEFERRED_SUBDOMAIN_DNS.md)。
