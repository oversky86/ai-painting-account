# Deferred: custom account subdomain DNS

**Status:** not in Period 1. Tracked for a later cutover.

## Checklist

1. Choose brand primary domain and subdomain, e.g. `account.viewbrush.com`.
2. In DNS provider, add the record Vercel Domains requires (usually CNAME → `cname.vercel-dns.com`).
3. In Vercel project Domains, add `account.<domain>` and wait for HTTPS.
4. Update in one change set:
   - `ACCOUNT_WEB_URL`
   - `shopify.app.toml` / production toml `[customer_authentication].redirect_uris`
   - Theme `settings.account_web_url`
   - `piktura-order-status` `ACCOUNT_WEB_URL` constant (or inject via metafield later)
5. Regression: login, logout, review deep link from order status, gift/shipping writes.

Do **not** set session cookies with `Domain=.brand.com` — keep HostOnly on the account host.
