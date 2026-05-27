// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/emailService.js
// Envío de emails con Resend.
// Solo se dispara cuando MP confirma el pago.
// ═══════════════════════════════════════

const { Resend } = require('resend');

// Inicializa Resend con el API Key del .env
const resend = new Resend(process.env.RESEND_API_KEY);

// Envía el email de confirmación al cliente
async function sendConfirmationEmail({ customerName, customerEmail, plan, price, orderId }) {

  const PLAN_LABELS = { basico: 'Básico', medio: 'Medio', pro: 'Pro' };

  const { data, error } = await resend.emails.send({
    from: 'KYNEXA Studio <noreply@kynexa.studio>', // ← cambiá por tu dominio
    to:      customerEmail,
    subject: `✓ Tu portfolio está en marcha — Orden ${orderId}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1A1A1A;">
        
        <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 8px;">
          KYNEXA <span style="font-weight: 300; font-size: 16px; letter-spacing: 4px;">STUDIO</span>
        </h1>
        
        <hr style="border: none; border-top: 1px solid #E8E8E8; margin: 24px 0;">
        
        <h2 style="font-size: 22px; font-weight: 900; margin-bottom: 8px;">
          Build iniciado, ${customerName}.
        </h2>
        
        <p style="font-size: 15px; color: #555; line-height: 1.7; margin-bottom: 32px;">
          Recibimos tu pago correctamente. Tu identidad digital está en construcción.
          Te contactaremos en las próximas 24hs con el acceso a tu portfolio.
        </p>

        <div style="background: #F5F5F5; padding: 24px; margin-bottom: 32px;">
          <p style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #999; margin-bottom: 16px;">Resumen del pedido</p>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: #999; padding: 6px 0;">Plan</td>
              <td style="text-align: right; font-weight: 600;">${PLAN_LABELS[plan]}</td>
            </tr>
            <tr>
              <td style="color: #999; padding: 6px 0;">Total abonado</td>
              <td style="text-align: right; font-weight: 600;">$${price}</td>
            </tr>
            <tr>
              <td style="color: #999; padding: 6px 0;">Orden</td>
              <td style="text-align: right; font-family: monospace; font-size: 12px;">${orderId}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #999; line-height: 1.7;">
          Si tenés alguna pregunta respondé este email o escribinos directamente.
        </p>

        <hr style="border: none; border-top: 1px solid #E8E8E8; margin: 32px 0;">
        
        <p style="font-size: 11px; color: #CCC; letter-spacing: 2px; text-transform: uppercase;">
          KYNEXA Studio — Identidades digitales para profesionales
        </p>

      </div>
    `
  });

  if (error) throw new Error(`Error enviando email: ${error.message}`);

  return data;
}

module.exports = { sendConfirmationEmail };