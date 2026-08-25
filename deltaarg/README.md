# Setup guide

Two files do the work:

- `index.html` — the page itself (dark, minimal, two fields: email + response).
- `functions/api/submit.js` — a Cloudflare Pages Function (serverless) that checks the passphrase server-side and sends the email through Resend. The correct code (`AUG30`) lives only in this file, never in the HTML/JS the browser can see — so view-source won't spoil it.

Follow these in order. All of it is free at this scale.

## 1. Get the domain live on Cloudflare

1. Sign up at [cloudflare.com](https://cloudflare.com) (free).
2. If you haven't bought the domain yet: **Domain Registration > Register Domain** in the dashboard (Cloudflare sells at cost, no markup — a `.com` is roughly $9-11/year, but check the live price when you buy). If you bought it elsewhere, add it to Cloudflare and update your registrar's nameservers to the two Cloudflare gives you.

## 2. Deploy the site to Cloudflare Pages

Easiest path: put this folder in a GitHub repo, then in the Cloudflare dashboard go to **Workers & Pages > Create > Pages > Connect to Git**, pick the repo, and deploy (framework preset: "None", no build command needed since it's static).

Once deployed, go to the Pages project's **Custom domains** tab and add your domain — since it's already on Cloudflare, this is a one-click DNS setup and HTTPS turns on automatically.

## 3. Set up Resend (sends the email)

1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day, 3,000/month, 3 verified domains — plenty for this).
2. **Domains > Add Domain**, enter your domain, and add the DNS records Resend gives you (SPF/DKIM) into your Cloudflare DNS panel. Verification usually takes a few minutes.
3. **API Keys > Create API Key** — copy it, you'll need it in step 5.

## 4. Set up Turnstile (free bot check — recommended)

Without this, anyone who finds the URL (search engines index everything eventually) could hammer the form with random people's email addresses and have "5.A" show up in strangers' inboxes. Turnstile stops that for free.

1. In the Cloudflare dashboard: **Turnstile > Add Site**, enter your domain.
2. Copy the **Site Key** into `index.html`, replacing `YOUR_TURNSTILE_SITE_KEY` in the `data-sitekey` attribute.
3. Copy the **Secret Key** — you'll set it as an environment variable in step 5.

If you'd rather skip this (e.g. you're only sharing the link privately with people you trust), delete the `.cf-turnstile` div and the two Turnstile `<script>` references from `index.html`, and remove `disabled` from the submit button.

## 5. Add environment variables in Cloudflare Pages

In your Pages project: **Settings > Environment variables**, add for the Production environment:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | the key from step 3 |
| `FROM_ADDRESS` | `W.D. Gaster <gaster@yourdomain.com>` (must be on the domain you verified in Resend) |
| `TURNSTILE_SECRET_KEY` | the secret key from step 4 (omit entirely if you skipped Turnstile) |

Redeploy after adding these (Pages > your project > Deployments > Retry deployment) so the Function picks them up.

## 6. Test it

Visit your domain, enter your own email and `AUG30` in the two fields, and confirm the email arrives. Try a wrong response too — it should just go quiet, no error, no hint.

## Notes

- The footer line ("unofficial fan project...") is there on purpose — small and easy to miss during the ARG, but it means the page isn't presented as something it's not. Feel free to restyle it (smaller, hidden in a page-source comment, whatever fits your vibe) but I'd keep it somewhere.
- The font is Google Fonts' `VT323`, a free CRT-terminal-style pixel font — not the actual Deltarune/Undertale typeface (that's a commercial font bundled with the game, not freely redistributable). If you already have a license or a fan-made lookalike font file you're comfortable using, swap it in with a standard `@font-face` rule in the `<style>` block.
- Everything here is stateless — nothing is logged or stored beyond what Cloudflare/Resend keep in their own dashboards for delivery/debugging.
