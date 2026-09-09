import { describe, expect, it } from 'vitest';

import { validateEnquiry } from './validate-enquiry';

const validEnquiry = {
  company: 'DGTL',
  email: 'Person@Example.com',
  message: 'Please help us launch a new product.',
  name: 'Nipuna',
  phone: '+94 11 555 0101',
  website: '',
};

describe('validateEnquiry', () => {
  it('normalizes a valid enquiry', () => {
    const result = validateEnquiry(validEnquiry);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('person@example.com');
  });

  it('rejects header injection and oversized messages', () => {
    expect(validateEnquiry({ ...validEnquiry, name: 'Person\nBcc: victim@example.com' }).success).toBe(false);
    expect(validateEnquiry({ ...validEnquiry, message: 'x'.repeat(5001) }).success).toBe(false);
  });

  it('retains the honeypot value so the route can silently discard bots', () => {
    const result = validateEnquiry({ ...validEnquiry, website: 'https://spam.invalid' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBe('https://spam.invalid');
  });
});

