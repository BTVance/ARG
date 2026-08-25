// src/index.js
//
// This is now a real Cloudflare Worker (not a Pages Function) — that's
// what your GitHub-connected build actually deploys with `wrangler deploy`.
// It handles /api/submit itself and hands every other request off to the
// static files in public/ via the ASSETS binding.

const CORRECT_CODE = "AUG30";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/submit" && request.method === "POST") {
      return handleSubmit(request, env);
    }

    // everything else (index.html, etc.) — let the static assets handle it
    return env.ASSETS.fetch(request);
  },
};

async function handleSubmit(request, env) {
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

  // Wrong code: stay quiet.
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
