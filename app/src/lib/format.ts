/**
 * Start–end truncation for a Solana base58 address.
 * truncateAddress("8q9AKYn7xDq1x61nM8aqpjsRUpBKobKCKCrvFETWn8Fr") === "8q9A…n8Fr"
 */
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
