const scope = process.env.DEPLOYMENT_SCOPE ?? 'cms-only';
if (!['cms-only', 'full-stack'].includes(scope)) {
  throw new Error('DEPLOYMENT_SCOPE must be cms-only or full-stack.');
}
const include = [
  { name: 'cms-web', dockerfile: 'apps/cms/Dockerfile', target: 'web', image: 'dgtl-cms-web' },
  { name: 'cms-worker', dockerfile: 'apps/cms/Dockerfile', target: 'worker', image: 'dgtl-cms-worker' },
  { name: 'cms-migrate', dockerfile: 'apps/cms/Dockerfile', target: 'migrate', image: 'dgtl-cms-migrate' },
];
if (scope === 'full-stack') {
  include.push(
    { name: 'client01', dockerfile: 'apps/website/Dockerfile', target: 'web', image: 'dgtl-client01' },
    { name: 'dgtl360', dockerfile: 'apps/dgtl360/Dockerfile', target: 'web', image: 'dgtl360' },
  );
}
console.log(`matrix=${JSON.stringify({ include })}`);
