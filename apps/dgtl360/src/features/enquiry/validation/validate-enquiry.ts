import type { EnquiryPayload, EnquiryValidationResult } from '../types/enquiry.types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(source: Record<string, unknown>, key: keyof EnquiryPayload) {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function validateEnquiry(value: unknown): EnquiryValidationResult {
  if (!isRecord(value)) {
    return { success: false, message: 'Invalid enquiry data.' };
  }

  const data: EnquiryPayload = {
    name: readText(value, 'name'),
    email: readText(value, 'email').toLowerCase(),
    company: readText(value, 'company'),
    phone: readText(value, 'phone'),
    message: readText(value, 'message'),
    website: readText(value, 'website'),
  };

  if (data.name.length < 2 || data.name.length > 100 || /[\r\n]/.test(data.name)) {
    return { success: false, message: 'Please enter a valid name.' };
  }

  if (data.email.length > 254 || !emailPattern.test(data.email)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  if (data.company.length > 120 || /[\r\n]/.test(data.company)) {
    return { success: false, message: 'Please enter a valid company name.' };
  }

  if (data.phone.length > 40 || /[\r\n]/.test(data.phone)) {
    return { success: false, message: 'Please enter a valid phone number.' };
  }

  if (data.message.length < 10 || data.message.length > 5000) {
    return { success: false, message: 'Please enter a message between 10 and 5,000 characters.' };
  }

  return { success: true, data };
}
