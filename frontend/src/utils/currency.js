export function formatNpr(price) {
  return `NPR ${Number(price).toLocaleString('en-NP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
