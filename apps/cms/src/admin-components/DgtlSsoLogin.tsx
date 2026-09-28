export default function DgtlSsoLogin() {
  if (process.env.CMS_SSO_ENABLED !== 'true') return null
  return (
    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
      <a href="/sso">Continue with DGTL Service</a>
      <p>
        Linked accounts use the DGTL dashboard. Local sign-in is for unmigrated or recovery
        accounts.
      </p>
    </div>
  )
}
