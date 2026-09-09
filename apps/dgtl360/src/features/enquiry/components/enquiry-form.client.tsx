'use client';

import { useId, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { CMSEnquiryContent } from '../../../lib/cms';
import styles from '../enquiry.module.css';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

export function EnquiryForm({ compact, labels }: { compact: boolean; labels?: CMSEnquiryContent }) {
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const statusId = useId();
  const statusMessages: Record<SubmissionState, string> = {
    idle: '',
    submitting: labels?.sendingLabel || 'Sending your enquiry…',
    success: labels?.successMessage || 'Thank you. Your enquiry has been sent.',
    error: labels?.errorMessage || 'We could not send your enquiry. Please try again or email info@dgtl.lk.',
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionState === 'submitting') {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmissionState('submitting');

    try {
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          company: formData.get('company'),
          phone: formData.get('phone'),
          message: formData.get('message'),
          website: formData.get('website'),
        }),
      });

      if (!response.ok) {
        throw new Error('Enquiry request failed');
      }

      form.reset();
      setSubmissionState('success');
    } catch {
      setSubmissionState('error');
    }
  }

  const buttonLabel = submissionState === 'submitting'
    ? (labels?.sendingLabel || 'SENDING…')
    : (labels?.submitLabel || 'SEND ENQUIRY');

  return (
    <>
      <form
        className={styles.form}
        onSubmit={handleSubmit}
        aria-describedby={submissionState === 'idle' ? undefined : statusId}
        data-service-reveal={compact ? '' : undefined}
        style={compact ? ({ '--reveal-delay': '220ms' } as CSSProperties) : undefined}
      >
        <label>
          <span>{labels?.nameLabel || 'YOUR NAME *'}</span>
          <input name="name" autoComplete="name" minLength={2} maxLength={100} required />
        </label>
        <label>
          <span>{labels?.emailLabel || 'YOUR EMAIL ADDRESS *'}</span>
          <input name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
        <label>
          <span>{labels?.companyLabel || 'COMPANY'}</span>
          <input name="company" autoComplete="organization" maxLength={120} />
        </label>
        <label>
          <span>{labels?.phoneLabel || 'PHONE'}</span>
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
        </label>
        <label className={styles.message}>
          <span>{labels?.messageLabel || 'YOUR MESSAGE *'}</span>
          <textarea name="message" rows={compact ? 4 : 3} minLength={10} maxLength={5000} required />
        </label>
        <div className={styles.honeypot} aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <button type="submit" disabled={submissionState === 'submitting'}>
          {buttonLabel}
        </button>
      </form>
      <p
        id={statusId}
        className={styles.formStatus}
        data-state={submissionState}
        role="status"
        aria-live="polite"
      >
        {statusMessages[submissionState]}
      </p>
    </>
  );
}
