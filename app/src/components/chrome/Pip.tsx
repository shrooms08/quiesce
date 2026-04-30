"use client";

export type PipStatus = "dormant" | "armed" | "warning" | "released";

export function Pip({
  status,
  children,
}: {
  status: PipStatus;
  children: React.ReactNode;
}) {
  return <span className={`pip ${status}`}>{children}</span>;
}
