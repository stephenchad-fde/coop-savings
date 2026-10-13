export function fmtNaira(kobo: number): string {
  return '₦' + (Number(kobo) / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}