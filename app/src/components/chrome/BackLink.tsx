"use client";

import { useRouter } from "next/navigation";

export function BackLink({ children = "Back" }: { children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "var(--sans)",
        fontSize: 13,
        color: "var(--ink-3)",
        letterSpacing: "0.02em",
      }}
    >
      ← {children}
    </button>
  );
}
