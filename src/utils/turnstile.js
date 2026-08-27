// ═══════════════════════════════════════
// KYNEXA BACKEND — src/utils/turnstile.js
// Verifica el token de Cloudflare Turnstile.
// Compartido entre validateGuia y validateReserva —
// mismo mecanismo anti-bot que ya se usaba
// en el flujo viejo de pedidos.
// ═══════════════════════════════════════

// ── Verifica el token de Turnstile contra la API de Cloudflare.
// Devuelve true si el challenge fue resuelto por un humano.
async function verifyTurnstileToken(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error('[FATAL] TURNSTILE_SECRET_KEY no está configurado — rechazando');
    return false;
  }

  if (!token) return false;

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });
    if (remoteIp) body.append('remoteip', remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await res.json();
    return data.success === true;

  } catch (err) {
    console.error('[verifyTurnstileToken] Error verificando con Cloudflare:', err.message);
    return false;
  }
}

module.exports = { verifyTurnstileToken };