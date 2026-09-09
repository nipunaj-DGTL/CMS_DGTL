import type { EnquiryPayload } from '../types/enquiry.types';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function display(value: string) {
  return value ? escapeHtml(value) : 'Not provided';
}

export function renderEnquiryEmail(enquiry: EnquiryPayload) {
  const messageHtml = escapeHtml(enquiry.message).replaceAll('\n', '<br />');

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f3f3ef;color:#111;font-family:Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;padding:40px 24px">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.12em">DGTL 360 WEBSITE</p>
      <h1 style="margin:0 0 28px;font-size:34px;line-height:1.05">New website enquiry</h1>
      <table role="presentation" style="width:100%;border-collapse:collapse;background:#fff">
        <tbody>
          <tr><td style="padding:14px;border-bottom:1px solid #ddd;font-weight:700">Name</td><td style="padding:14px;border-bottom:1px solid #ddd">${display(enquiry.name)}</td></tr>
          <tr><td style="padding:14px;border-bottom:1px solid #ddd;font-weight:700">Email</td><td style="padding:14px;border-bottom:1px solid #ddd">${display(enquiry.email)}</td></tr>
          <tr><td style="padding:14px;border-bottom:1px solid #ddd;font-weight:700">Company</td><td style="padding:14px;border-bottom:1px solid #ddd">${display(enquiry.company)}</td></tr>
          <tr><td style="padding:14px;border-bottom:1px solid #ddd;font-weight:700">Phone</td><td style="padding:14px;border-bottom:1px solid #ddd">${display(enquiry.phone)}</td></tr>
        </tbody>
      </table>
      <h2 style="margin:28px 0 10px;font-size:18px">Message</h2>
      <div style="padding:18px;background:#fff;line-height:1.6">${messageHtml}</div>
      <p style="margin:24px 0 0;color:#666;font-size:12px;line-height:1.5">Reply to this email to respond directly to ${display(enquiry.name)}.</p>
    </div>
  </body>
</html>`;
}

export function renderEnquiryText(enquiry: EnquiryPayload) {
  return [
    'New DGTL 360 website enquiry',
    '',
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Company: ${enquiry.company || 'Not provided'}`,
    `Phone: ${enquiry.phone || 'Not provided'}`,
    '',
    'Message:',
    enquiry.message,
  ].join('\n');
}
