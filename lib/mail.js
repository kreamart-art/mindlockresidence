// E-mail via Resend. Zonder RESEND_API_KEY valt 'ie terug op console.log,
// zodat lokaal alles blijft werken. Gebruikt de REST API via fetch (geen extra dep nodig).
const API_KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.SHOP_FROM_EMAIL || 'Mindlock Residence <shop@mindlockresidence.com>';
const CONTACT_TO = process.env.CONTACT_TO_EMAIL || 'Mindlockresidence@gmail.com';

async function send(to, subject, html, opts = {}) {
  if (!to) return { ok: false, skipped: 'no-recipient' };
  if (!API_KEY) {
    console.log('[mail] (geen RESEND_API_KEY) zou sturen naar', to, '|', subject);
    console.log('[mail] body:', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400));
    return { ok: true, dev: true };
  }
  try {
    const payload = { from: FROM, to: [to], subject, html };
    if (opts.replyTo) payload.reply_to = [opts.replyTo];
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) { console.error('[mail] Resend fout', r.status, await r.text()); return { ok: false }; }
    return { ok: true };
  } catch (e) {
    console.error('[mail] Resend exception', e.message);
    return { ok: false };
  }
}

const wrap = (inner) => `<div style="font-family:Arial,Helvetica,sans-serif;background:#0b0b0d;color:#f5f5f5;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#141416;border:1px solid #242424;border-radius:12px;padding:28px">
    <div style="font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;font-size:14px;margin-bottom:18px">MINDLOCK<span style="color:#e10600">RESIDENCE</span></div>
    ${inner}
    <p style="color:#8a8a8a;font-size:12px;margin-top:24px">Mindlock Residence, Amsterdam</p>
  </div></div>`;

export function sendDigitalDelivery(order, links) {
  const list = links.map(l => `<li style="margin:8px 0"><a href="${l.url}" style="color:#e10600">${escapeHtml(l.name)}</a></li>`).join('');
  const html = wrap(`
    <h2 style="margin:0 0 12px;font-size:20px">Bedankt voor je aankoop</h2>
    <p style="color:#cfcfcf;line-height:1.6">Je downloads staan klaar. De links blijven een paar dagen geldig.</p>
    <ul style="padding-left:18px">${list}</ul>`);
  return send(order.email, 'Je downloads van Mindlock Residence', html);
}

export function sendPhysicalConfirmation(order, items) {
  const list = items.map(i => `<li style="margin:6px 0">${i.quantity}x ${escapeHtml(i.name)}</li>`).join('');
  const html = wrap(`
    <h2 style="margin:0 0 12px;font-size:20px">Bestelling bevestigd</h2>
    <p style="color:#cfcfcf;line-height:1.6">We hebben je bestelling ontvangen en maken 'm klaar voor verzending.</p>
    <ul style="padding-left:18px">${list}</ul>`);
  return send(order.email, 'Je bestelling bij Mindlock Residence', html);
}

export function sendTracking(order) {
  const html = wrap(`
    <h2 style="margin:0 0 12px;font-size:20px">Je bestelling is onderweg</h2>
    <p style="color:#cfcfcf;line-height:1.6">Track &amp; trace: <strong>${escapeHtml(order.tracking)}</strong></p>`);
  return send(order.email, 'Je bestelling is verzonden', html);
}

// Bericht uit het contactformulier naar de eigenaar. Reply-to staat op de
// afzender, zodat je in je mailprogramma direct kunt antwoorden.
export function sendContactMessage(msg) {
  const row = (label, value) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#8a8a8a;font-size:13px;vertical-align:top;white-space:nowrap">${label}</td>` +
    `<td style="padding:6px 0;color:#f0f0f0;font-size:14px">${escapeHtml(value)}</td></tr>`;
  const html = wrap(`
    <h2 style="margin:0 0 4px;font-size:20px">Nieuwe aanvraag via de site</h2>
    <p style="color:#8a8a8a;font-size:13px;margin:0 0 18px">Antwoord gewoon op deze mail om ${escapeHtml(msg.name)} te bereiken.</p>
    <table style="border-collapse:collapse;margin-bottom:18px">
      ${row('Naam', msg.name)}
      ${row('E-mail', msg.email)}
      ${row('Project', msg.type || 'Niet opgegeven')}
    </table>
    <div style="border-top:1px solid #242424;padding-top:16px">
      <div style="color:#8a8a8a;font-size:13px;margin-bottom:8px">Bericht</div>
      <div style="color:#f0f0f0;font-size:14px;line-height:1.65;white-space:pre-wrap">${escapeHtml(msg.message)}</div>
    </div>`);
  return send(CONTACT_TO, `Aanvraag van ${msg.name}`, html, { replyTo: msg.email });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
