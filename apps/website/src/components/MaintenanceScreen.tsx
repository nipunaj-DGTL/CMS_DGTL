import React from 'react'

export function MaintenanceScreen({ name }: { name: string }) {
  return (
    <main className="maintenance-screen" role="status">
      <p>{name}</p>
      <h1>Website temporarily unavailable</h1>
      <p>Scheduled maintenance is in progress. Please check back soon.</p>
    </main>
  )
}
