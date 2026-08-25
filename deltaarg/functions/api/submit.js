// functions/api/submit.js
//
// Cloudflare Pages Function. Handles the ARG form submission:
//   - validates the email address
//   - (optionally) verifies the Cloudflare Turnstile bot-check token
//   - checks the passphrase against CORRECT_CODE
//   - if it matches, sends the "5.A" email via Resend
//
// Required environment variables (set in Cloudflare Pages > Settings >
// Environment variables — see README.md):
//   RESEND_API_KEY      your Resend API key
//   FROM_ADDRESS         e.g. "W.D. Gaster <gaster@yourdomain.com>"
//   TURNSTILE_SECRET_KEY optional — omit to skip the bot check entirely

const CORRECT_CODE = "ROCKCANDY";

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const email = (body.email || "").trim();
  const response = (body.response || "").trim().toUpperCase();
  const turnstileToken = body.turnstileToken;

  if (!isValidEmail(email)) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }

  if (env.TURNSTILE_SECRET_KEY) {
    const passed = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, request);
    if (!passed) {
      return json({ ok: false, error: "bot_check_failed" }, 403);
    }
  }

  // Wrong code: stay quiet. Don't confirm or deny anything about what the
  // right answer might be — that's the whole point of an ARG gate.
  if (response !== CORRECT_CODE) {
    return json({ ok: false }, 200);
  }

  if (!env.RESEND_API_KEY || !env.FROM_ADDRESS) {
    return json({ ok: false, error: "not_configured" }, 500);
  }

  const sendResp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_ADDRESS,
      to: [email],
      subject: "5.A",
      text: "5.A",
    }),
  });

  if (!sendResp.ok) {
    const detail = await sendResp.text();
    return json({ ok: false, error: "send_failed", detail }, 502);
  }

  return json({ ok: true }, 200);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyTurnstile(token, secret, request) {
  if (!token) return false;

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const outcome = await resp.json();
  return outcome.success === true;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
