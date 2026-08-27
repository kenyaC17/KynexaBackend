// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/emailService.js
// Envío de emails con Resend.
// Tres tipos: guía gratuita (con PDF adjunto),
// confirmación de turno a la persona, y aviso
// de turno nuevo a Kenya.
// ═══════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FRONTEND_URL  = process.env.FRONTEND_URL || 'https://kynexa.studio';
const KYNEXA_EMAIL  = process.env.KYNEXA_NOTIFICATION_EMAIL || 'kynexa.studio@gmail.com';

// ── Ruta del PDF de la guía — el archivo tiene que subirse acá.
// Ver assets/README.md para más detalle.
const GUIA_PDF_PATH = path.join(__dirname, '../../assets/guia-kynexa.pdf');

// ── Estilos base compartidos por los 3 templates — paleta cálida de la marca
const ESTILOS = {
  fondo:   '#F6F1E9', // lino
  ink:     '#201D1A',
  azul:    '#3D5A6C',
  oliva:   '#6E7A45',
  muted:   '#6b6459',
};

function wrapperEmail(contenidoHtml) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:${ESTILOS.fondo};">
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width:560px; margin:0 auto; padding:40px 24px; color:${ESTILOS.ink};">

        <div style="font-family: Georgia, serif; font-size:22px; font-weight:700; letter-spacing:-0.01em; margin-bottom:32px;">
          KYNEXA
        </div>

        ${contenidoHtml}

        <hr style="border:none; border-top:1px solid rgba(61,90,108,0.15); margin:36px 0 20px;">
        <p style="font-size:11px; color:${ESTILOS.muted}; letter-spacing:1px; text-transform:uppercase;">
          KYNEXA — Dirección de carrera y presencia profesional
        </p>
      </div>
    </body>
    </html>
  `;
}

// ── Email de la guía gratuita — con el PDF adjunto.
// Se envía apenas alguien completa el formulario de la s6.
async function sendGuiaEmail({ nombre, email }) {

  const agendarUrl = `${FRONTEND_URL}/#s6`;

  const html = wrapperEmail(`
    <h1 style="font-size:22px; font-weight:700; margin-bottom:12px;">
      ¿Por qué no te están encontrando?
    </h1>
    <p style="font-size:15px; line-height:1.7; color:${ESTILOS.muted}; margin-bottom:24px;">
      Hola ${nombre}, acá tenés la guía adjunta — para entender qué puede estar
      frenando tu búsqueda profesional, antes de tocar una sola línea de tu CV.
    </p>
    <p style="font-size:15px; line-height:1.7; color:${ESTILOS.muted}; margin-bottom:32px;">
      Si después de leerla querés charlar sobre tu caso puntual, la consulta
      inicial es gratuita.
    </p>
    <div style="text-align:center; margin-bottom:8px;">
      <a href="${agendarUrl}" style="
        display:inline-block; background:${ESTILOS.azul}; color:${ESTILOS.fondo};
        font-family:Georgia,serif; font-size:14px; font-weight:600;
        text-decoration:none; padding:14px 32px; border-radius:100px;
      ">Agendar consulta gratuita →</a>
    </div>
  `);

  let attachments = [];
  try {
    const pdfBuffer = fs.readFileSync(GUIA_PDF_PATH);
    attachments = [{
      filename: 'guia-kynexa-entrevistas-y-plataformas.pdf',
      content:  pdfBuffer,
    }];
  } catch (err) {
    // Si el PDF todavía no está subido al repo, el mail sale igual
    // pero sin adjunto — se loguea fuerte para que no pase desapercibido.
    console.error('[emailService] ⚠️ No se encontró el PDF de la guía en', GUIA_PDF_PATH, '— revisar assets/README.md');
  }

  const { data, error } = await resend.emails.send({
    from:        'KYNEXA <noreply@kynexa.studio>',
    to:          email,
    subject:     '¿Por qué no te están encontrando? — Tu guía de KYNEXA',
    html,
    attachments,
  });

  if (error) throw new Error(`Error enviando email de guía: ${error.message}`);
  return data;
}

// ── Email de confirmación de turno — a la persona que reservó.
async function sendReservaConfirmationEmail({ nombre, email, fecha, hora }) {

  const html = wrapperEmail(`
    <h1 style="font-size:22px; font-weight:700; margin-bottom:12px;">
      Turno confirmado, ${nombre}.
    </h1>
    <p style="font-size:15px; line-height:1.7; color:${ESTILOS.muted}; margin-bottom:24px;">
      Quedó agendada tu videollamada gratuita con KYNEXA.
    </p>
    <div style="background:rgba(61,90,108,0.06); border-left:2px solid ${ESTILOS.azul}; padding:20px 24px; margin-bottom:28px;">
      <p style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${ESTILOS.muted}; margin-bottom:8px;">Tu turno</p>
      <p style="font-size:17px; font-weight:600; margin:0;">${fecha} — ${hora}</p>
    </div>
    <p style="font-size:14px; line-height:1.7; color:${ESTILOS.muted};">
      Te va a llegar el link de la videollamada más cerca de la fecha.
      Cualquier cosa, respondé este mismo mail.
    </p>
  `);

  const { data, error } = await resend.emails.send({
    from:    'KYNEXA <noreply@kynexa.studio>',
    to:      email,
    subject: `Tu turno con KYNEXA — ${fecha} ${hora}`,
    html,
  });

  if (error) throw new Error(`Error enviando confirmación de turno: ${error.message}`);
  return data;
}

// ── Email de aviso — a Kenya, cuando alguien reserva un turno.
async function sendReservaAlertEmail({ nombreCompleto, email, telefono, fecha, hora, nota, tieneAdjuntoCv }) {

  const html = wrapperEmail(`
    <h1 style="font-size:20px; font-weight:700; margin-bottom:20px;">
      Nuevo turno agendado
    </h1>
    <table style="width:100%; font-size:14px; border-collapse:collapse;">
      <tr><td style="color:${ESTILOS.muted}; padding:6px 0; width:110px;">Cuándo</td><td style="font-weight:600;">${fecha} — ${hora}</td></tr>
      <tr><td style="color:${ESTILOS.muted}; padding:6px 0;">Nombre</td><td>${nombreCompleto}</td></tr>
      <tr><td style="color:${ESTILOS.muted}; padding:6px 0;">Email</td><td>${email}</td></tr>
      <tr><td style="color:${ESTILOS.muted}; padding:6px 0;">Teléfono</td><td>${telefono || '—'}</td></tr>
      <tr><td style="color:${ESTILOS.muted}; padding:6px 0;">CV adjunto</td><td>${tieneAdjuntoCv ? 'Sí' : 'No'}</td></tr>
    </table>
    ${nota ? `
      <div style="background:rgba(110,122,69,0.08); padding:16px 20px; margin-top:20px;">
        <p style="font-size:11px; letter-spacing:1px; text-transform:uppercase; color:${ESTILOS.muted}; margin-bottom:6px;">Nota</p>
        <p style="font-size:14px; margin:0;">${nota}</p>
      </div>
    ` : ''}
  `);

  const { data, error } = await resend.emails.send({
    from:    'KYNEXA <noreply@kynexa.studio>',
    to:      KYNEXA_EMAIL,
    subject: `Nuevo turno — ${fecha} ${hora} — ${nombreCompleto}`,
    html,
  });

  if (error) throw new Error(`Error enviando aviso de turno: ${error.message}`);
  return data;
}

module.exports = { sendGuiaEmail, sendReservaConfirmationEmail, sendReservaAlertEmail };