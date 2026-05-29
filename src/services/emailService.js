// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/emailService.js
// Envío de emails con Resend.
// Dos tipos: recovery (pedido registrado)
// y confirmación (pago aprobado).
// ═══════════════════════════════════════

const { Resend } = require('resend');

// Inicializa Resend con el API Key del .env
const resend = new Resend(process.env.RESEND_API_KEY);

// ── URL base del frontend — usada en los links de los emails
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://kynexa.studio';

// ── Labels legibles por plan — definidos una sola vez como constante del módulo
// Evita duplicación entre sendOrderRecoveryEmail y sendConfirmationEmail
const PLAN_LABELS = {
  basico: 'Básico',
  medio:  'Medio',
  pro:    'Pro',
};

// ── Email de recovery
// Se envía cuando el pedido es creado pero el pago no está completo.
// Incluye link directo al builder para retomar el pago.
async function sendOrderRecoveryEmail({ customerName, customerEmail, plan, price, orderId }) {

  const checkoutUrl = `${FRONTEND_URL}/builder.html?resume=${orderId}`;

  const { data, error } = await resend.emails.send({
    from:    'KYNEXA Studio <noreply@kynexa.studio>',
    to:      customerEmail,
    subject: `Tu orden fue generada — ${orderId.slice(0, 8).toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KYNEXA Studio — Orden registrada</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FFFFFF;">

        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1A1A1A;">

          <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 8px;">
            KYNEXA <span style="font-weight: 300; font-size: 16px; letter-spacing: 4px;">STUDIO</span>
          </h1>

          <hr style="border: none; border-top: 1px solid #E8E8E8; margin: 24px 0;">

          <h2 style="font-size: 22px; font-weight: 900; margin-bottom: 8px;">
            Tu orden fue registrada, ${customerName}.
          </h2>

          <p style="font-size: 15px; color: #555; line-height: 1.7; margin-bottom: 32px;">
            Recibimos tu solicitud correctamente. Solo falta completar el pago para iniciar
            el build de tu portfolio profesional.
          </p>

          <div style="background: #F5F5F5; padding: 24px; margin-bottom: 32px;">
            <p style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #999; margin-bottom: 16px;">Resumen del pedido</p>
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="color: #999; padding: 6px 0;">Plan</td>
                <td style="text-align: right; font-weight: 600;">${PLAN_LABELS[plan] ?? plan}</td>
              </tr>
              <tr>
                <td style="color: #999; padding: 6px 0;">Total</td>
                <td style="text-align: right; font-weight: 600;">$${price} ARS</td>
              </tr>
              <tr>
                <td style="color: #999; padding: 6px 0;">Orden</td>
                <td style="text-align: right; font-family: monospace; font-size: 12px;">${orderId}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${checkoutUrl}" style="
              display: inline-block;
              background: #1A1A1A;
              color: #FFFFFF;
              font-family: Georgia, serif;
              font-size: 14px;
              font-weight: 600;
              letter-spacing: 2px;
              text-transform: uppercase;
              text-decoration: none;
              padding: 16px 40px;
            ">Completar pago →</a>
          </div>

          <p style="font-size: 13px; color: #999; line-height: 1.7;">
            Si ya completaste el pago podés ignorar este email.
            Si tenés alguna pregunta respondé este email o escribinos directamente.
          </p>

          <hr style="border: none; border-top: 1px solid #E8E8E8; margin: 32px 0;">

          <p style="font-size: 11px; color: #CCC; letter-spacing: 2px; text-transform: uppercase;">
            KYNEXA Studio — Identidades digitales para profesionales
          </p>

        </div>

      </body>
      </html>
    `,
  });

  if (error) throw new Error(`Error enviando email de recovery: ${error.message}`);

  return data;
}

// ── Email de confirmación de pago
// Se envía cuando MP confirma el pago via webhook.
// Es el único email que confirma que el trabajo va a empezar.
async function sendConfirmationEmail({ customerName, customerEmail, plan, price, orderId }) {

  const { data, error } = await resend.emails.send({
    from:    'KYNEXA Studio <noreply@kynexa.studio>',
    to:      customerEmail,
    subject: `✓ Tu portfolio está en marcha — Orden ${orderId}`,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KYNEXA Studio — Confirmación de pedido</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FFFFFF;">

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
                <td style="text-align: right; font-weight: 600;">${PLAN_LABELS[plan] ?? plan}</td>
              </tr>
              <tr>
                <td style="color: #999; padding: 6px 0;">Total abonado</td>
                <td style="text-align: right; font-weight: 600;">$${price} ARS</td>
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

      </body>
      </html>
    `,
  });

  if (error) throw new Error(`Error enviando email de confirmación: ${error.message}`);

  return data;
}

module.exports = { sendConfirmationEmail, sendOrderRecoveryEmail };