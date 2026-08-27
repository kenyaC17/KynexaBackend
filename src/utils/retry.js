// ═══════════════════════════════════════
// KYNEXA BACKEND — src/utils/retry.js
// Reintenta una función async un par de veces
// antes de rendirse. Usado para el envío de
// emails — evita perder un aviso por una falla
// pasajera de Resend, sin armar una cola compleja.
// ═══════════════════════════════════════

async function withRetry(fn, { intentos = 3, esperaMs = 1000 } = {}) {
  let ultimoError;

  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (err) {
      ultimoError = err;
      if (i < intentos - 1) {
        await new Promise(r => setTimeout(r, esperaMs * (i + 1)));
      }
    }
  }

  throw ultimoError;
}

module.exports = { withRetry };