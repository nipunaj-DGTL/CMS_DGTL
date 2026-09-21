import { pathToFileURL } from 'node:url';

const placeholder = /replace[-_ ]|placeholder|change[-_ ]?me|^ci-|^demo-|^local-|[<>]/i;
const websiteKey = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const httpsOrigin = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === value && !url.username && !url.password
      && !/(^localhost$|\.localhost$|\.test$|\.example$|\.invalid$)/i.test(url.hostname)
      && !['127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
};

/** Configuration checks only: no network calls, writes, or secret values in errors. */
export function validateProductionEnvironment(env, { expectedOrigin, role = 'runtime' } = {}) {
  const errors = [];
  const requireValue = key => {
    const value = env[key]?.trim() || '';
    if (!value || placeholder.test(value)) errors.push(`${key}: missing or placeholder value`);
    return value;
  };
  if (!['runtime', 'migration'].includes(role)) errors.push('role: use runtime or migration');
  if (env.NODE_ENV !== 'production') errors.push('NODE_ENV: must be production');
  if (env.PAYLOAD_DB_PUSH !== 'false') errors.push('PAYLOAD_DB_PUSH: must be false');
  if (env.PAYLOAD_DROP_DATABASE === 'true') errors.push('PAYLOAD_DROP_DATABASE: destructive flag must not be enabled');
  if (env.CMS_LOCAL_DOCKER === 'true') errors.push('CMS_LOCAL_DOCKER: local bootstrap must not be enabled');
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') errors.push('NODE_TLS_REJECT_UNAUTHORIZED: TLS verification must remain enabled');

  const origin = requireValue('CMS_PUBLIC_URL');
  if (!httpsOrigin(origin)) errors.push('CMS_PUBLIC_URL: use a real HTTPS origin without a trailing slash or path');
  if (expectedOrigin && origin !== expectedOrigin) errors.push('CMS_PUBLIC_URL: does not match the release CMS_ORIGIN');
  for (const allowed of (env.CMS_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)) {
    if (!httpsOrigin(allowed)) errors.push('CMS_ALLOWED_ORIGINS: every entry must be an explicit HTTPS origin');
  }

  // Check equality without ever including secret values in output.
  const secrets = new Map();
  const secret = (key, value = requireValue(key)) => {
    if (value.length < 32 || placeholder.test(value)) errors.push(`${key}: use at least 32 randomly generated characters, not a placeholder`);
    if (secrets.has(value)) errors.push(`${key}: must not reuse another signing secret or website token`);
    secrets.set(value, key);
  };
  secret('PAYLOAD_SECRET');
  secret('CMS_PREVIEW_SIGNING_SECRET');
  const maps = [];
  for (const name of ['CMS_WEBSITE_READ_TOKENS', 'CMS_REVALIDATION_SECRETS']) {
    try {
      const parsed = JSON.parse(env[name] || '');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      maps.push(Object.keys(parsed).sort());
      for (const [key, value] of Object.entries(parsed)) {
        if (!websiteKey.test(key) || typeof value !== 'string') throw new Error();
        // Do not echo user-controlled keys: malformed input can itself be sensitive.
        secret(`${name} entry`, value);
      }
    } catch { errors.push(`${name}: must be a JSON object of website keys and string secrets (use {} before onboarding)`); }
  }
  if (maps.length === 2 && JSON.stringify(maps[0]) !== JSON.stringify(maps[1])) {
    errors.push('Website token maps: read and revalidation maps must contain the same website keys');
  }

  try {
    const url = new URL(requireValue('CMS_DATABASE_URL'));
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || url.pathname.length < 2) throw new Error();
    if (placeholder.test(decodeURIComponent(url.password))) errors.push('CMS_DATABASE_URL: replace the database password placeholder');
    if (role === 'runtime' && ['postgres', 'root', 'dgtl_migrator'].includes(decodeURIComponent(url.username))) {
      errors.push('CMS_DATABASE_URL: use a dedicated least-privileged runtime user, not an administrator or migrator');
    }
    if (['disable', 'no-verify'].includes(url.searchParams.get('sslmode'))) errors.push('CMS_DATABASE_URL: do not explicitly disable database TLS verification');
  } catch { errors.push('CMS_DATABASE_URL: require a PostgreSQL URL with user, password, host and database'); }

  if (env.CMS_MEDIA_STORAGE !== 's3') errors.push('CMS_MEDIA_STORAGE: must be s3');
  if (!httpsOrigin(requireValue('CMS_MEDIA_ENDPOINT'))) errors.push('CMS_MEDIA_ENDPOINT: use an HTTPS storage origin');
  for (const key of ['CMS_MEDIA_BUCKET', 'CMS_MEDIA_ACCESS_KEY_ID', 'CMS_MEDIA_SECRET_ACCESS_KEY']) requireValue(key);
  if (env.CMS_MEDIA_SCAN_MODE !== 'clamav') errors.push('CMS_MEDIA_SCAN_MODE: must be clamav');
  requireValue('CLAMAV_HOST');
  if (env.CMS_EMAIL_PROVIDER !== 'resend') errors.push('CMS_EMAIL_PROVIDER: must be resend');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requireValue('CMS_EMAIL_FROM_ADDRESS'))) errors.push('CMS_EMAIL_FROM_ADDRESS: invalid email address');
  requireValue('CMS_EMAIL_FROM_NAME');
  requireValue('RESEND_API_KEY');
  return [...new Set(errors)];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--expected-origin', '--role'].includes(args[i]) || !args[i + 1]) {
      console.error('Usage: node production-preflight.mjs [--expected-origin HTTPS_ORIGIN] [--role runtime|migration]');
      process.exit(2);
    }
    options[args[i] === '--role' ? 'role' : 'expectedOrigin'] = args[i + 1];
  }
  const errors = validateProductionEnvironment(process.env, options);
  if (errors.length) {
    console.error(`Production configuration blocked:\n- ${errors.join('\n- ')}`);
    process.exitCode = 1;
  } else {
    console.log('Production configuration preflight passed. No external connectivity, backup, firewall or user-journey checks were performed.');
  }
}
