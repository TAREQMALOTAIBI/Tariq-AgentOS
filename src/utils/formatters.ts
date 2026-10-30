/**
 * Safe, robust date and time formatters that render cleanly across all browser engines
 */

export function formatSafeTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return '10:00 ص';
  }
}

export function formatSafeDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = d.getDate();
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const month = months[d.getMonth()] || '';
    return `${day} ${month}`;
  } catch {
    return 'اليوم';
  }
}
