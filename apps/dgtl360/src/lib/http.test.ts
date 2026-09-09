import { describe, expect, it } from 'vitest';

import { readLimitedText, RequestTooLargeError } from './http';

describe('readLimitedText', () => {
  it('reads a UTF-8 body up to the configured byte limit', async () => {
    const request = new Request('https://dgtl.lk/api/test', { body: 'hello', method: 'POST' });
    await expect(readLimitedText(request, 5)).resolves.toBe('hello');
  });

  it('rejects an oversized body even without a content-length header', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('1234'));
        controller.enqueue(new TextEncoder().encode('5678'));
        controller.close();
      },
    });
    const request = new Request('https://dgtl.lk/api/test', {
      body: stream,
      // Node requires duplex for streaming request bodies; it is a runtime
      // extension that is intentionally absent from the DOM RequestInit type.
      duplex: 'half',
      method: 'POST',
    } as RequestInit & { duplex: 'half' });

    await expect(readLimitedText(request, 7)).rejects.toBeInstanceOf(RequestTooLargeError);
  });

  it('rejects an invalid or oversized declared content length', async () => {
    const invalid = new Request('https://dgtl.lk/api/test', { headers: { 'content-length': 'unknown' }, method: 'POST' });
    const oversized = new Request('https://dgtl.lk/api/test', { headers: { 'content-length': '100' }, method: 'POST' });
    await expect(readLimitedText(invalid, 10)).rejects.toBeInstanceOf(RequestTooLargeError);
    await expect(readLimitedText(oversized, 10)).rejects.toBeInstanceOf(RequestTooLargeError);
  });
});

