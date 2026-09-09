import 'server-only';
import { Resend } from 'resend';
import { renderEnquiryEmail, renderEnquiryText } from '../email/enquiry-email';
import type { EnquiryPayload } from '../types/enquiry.types';

export async function sendEnquiryEmail(enquiry: EnquiryPayload) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const resend = new Resend(apiKey);
  const from = process.env.ENQUIRY_FROM_EMAIL || (process.env.NODE_ENV === 'production' ? undefined : 'DGTL 360 Website <onboarding@resend.dev>');
  const to = process.env.ENQUIRY_TO_EMAIL || (process.env.NODE_ENV === 'production' ? undefined : 'riz@dgtl.lk');
  if (!from || !to) throw new Error('ENQUIRY_FROM_EMAIL and ENQUIRY_TO_EMAIL are required in production.');

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: enquiry.email,
    subject: `New website enquiry from ${enquiry.name}`,
    html: renderEnquiryEmail(enquiry),
    text: renderEnquiryText(enquiry),
  });

  if (error) {
    throw new Error(`Resend rejected the enquiry email: ${error.message}`);
  }

  return data;
}
