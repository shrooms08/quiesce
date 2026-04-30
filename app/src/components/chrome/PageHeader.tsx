"use client";

import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  meta,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        padding: "56px 0 28px",
        borderBottom: "1px solid var(--rule-2)",
      }}
    >
      <div>
        {eyebrow && (
          <div className="h-section" style={{ marginBottom: 14 }}>
            {eyebrow}
          </div>
        )}
        <div className="h-1">{title}</div>
        {meta && (
          <div className="meta" style={{ marginTop: 12 }}>
            {meta}
          </div>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
