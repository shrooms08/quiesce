"use client";

import { QUIESCE_PROGRAM_ID } from "@/lib/constants";

const programIdShort = `${QUIESCE_PROGRAM_ID.slice(0, 7)}…${QUIESCE_PROGRAM_ID.slice(-4)}`;

function FooterLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="#"
      style={{
        display: "block",
        fontSize: 14,
        color: "var(--ink-2)",
        textDecoration: "none",
        padding: "4px 0",
      }}
    >
      {children}
    </a>
  );
}

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--rule)", marginTop: 160 }}>
      <div
        className="shell"
        style={{
          padding: "48px 32px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          gap: 40,
        }}
      >
        <div>
          <div className="wordmark" style={{ display: "block", marginBottom: 14 }}>
            Quiesce
          </div>
          <div className="meta" style={{ maxWidth: "28ch" }}>
            A protocol for conditional asset release on Solana. Non-custodial.
            Audited by OtterSec, January 2026.
          </div>
        </div>
        <div>
          <div className="h-section" style={{ marginBottom: 14 }}>
            Protocol
          </div>
          <FooterLink>Whitepaper</FooterLink>
          <FooterLink>Audit reports</FooterLink>
          <FooterLink>On-chain program</FooterLink>
        </div>
        <div>
          <div className="h-section" style={{ marginBottom: 14 }}>
            Resources
          </div>
          <FooterLink>Documentation</FooterLink>
          <FooterLink>Integration guide</FooterLink>
          <FooterLink>PUSD</FooterLink>
        </div>
        <div>
          <div className="h-section" style={{ marginBottom: 14 }}>
            Contact
          </div>
          <div className="body-sm" style={{ color: "var(--ink-2)" }}>
            Quiesce Labs
            <br />
            1 Pine Street, Suite 2400
            <br />
            San Francisco, CA 94111
            <br />
            <span className="addr" style={{ display: "inline-block", marginTop: 8 }}>
              desk@quiesce.xyz
            </span>
          </div>
        </div>
      </div>
      <div
        className="shell"
        style={{
          padding: "24px 32px",
          borderTop: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div className="meta">© 2026 Quiesce Labs, Inc.</div>
        <div className="meta">
          Program ID{" "}
          <span className="addr" style={{ fontSize: 12 }}>
            {programIdShort}
          </span>
        </div>
      </div>
    </footer>
  );
}
