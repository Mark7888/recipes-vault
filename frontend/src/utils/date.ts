export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
