export function truncateAddress(address: string): string {
  if (!address || address.length < 9) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
