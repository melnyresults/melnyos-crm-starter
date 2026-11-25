// Use one business day across the dashboard, approval batches and activity reports.
export const businessTimeZone =
  process.env.NEXT_PUBLIC_CRM_TIME_ZONE || 'America/Toronto'
export const timeZoneLabel = businessTimeZone
  .split('/')
  .pop()!
  .replaceAll('_', ' ')
