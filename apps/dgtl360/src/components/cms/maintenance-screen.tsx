export function MaintenanceScreen({ message, name }: { message?: null | string; name: string }) {
  return (
    <main className="site-state" role="status">
      <p>{name}</p>
      <h1>We’ll be right back.</h1>
      <span>{message || 'This website is undergoing scheduled maintenance. Please check again shortly.'}</span>
    </main>
  );
}
