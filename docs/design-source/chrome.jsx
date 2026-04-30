/* Quiesce — shared chrome (top bar, footer, wordmark, small atoms) */

const Wordmark = ({ onClick }) => (
  <a href="#" className="wordmark" onClick={(e) => { e.preventDefault(); onClick && onClick(); }}>
    Quiesce
  </a>
);

const TopBar = ({ view, setView, mode = "app" }) => {
  // mode: "marketing" or "app"
  const navMarketing = [
    { id: "landing", label: "Protocol" },
    { id: "docs",    label: "Docs" },
  ];
  const navApp = [
    { id: "dashboard", label: "Vaults" },
    { id: "activity",  label: "Activity" },
    { id: "docs",      label: "Docs" },
  ];
  const items = mode === "marketing" ? navMarketing : navApp;
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <Wordmark onClick={() => setView("landing")} />
          {mode === "app" && (
            <span className="meta" style={{ color: "var(--ink-3)", letterSpacing: "0.04em" }}>
              · 0xA1B2…F4D9
            </span>
          )}
        </div>
        <nav className="topnav">
          {items.map((it) => (
            <a
              key={it.id}
              href="#"
              className={view === it.id ? "active" : ""}
              onClick={(e) => { e.preventDefault(); if (it.id === "dashboard") setView("dashboard"); }}
            >
              {it.label}
            </a>
          ))}
          {mode === "marketing" ? (
            <button className="btn btn-sm" onClick={() => setView("dashboard")}>
              Launch app
            </button>
          ) : (
            <button className="btn-quiet" style={{ fontSize: 13.5 }} onClick={() => setView("landing")}>
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

const Footer = () => (
  <footer style={{ borderTop: "1px solid var(--rule)", marginTop: 160 }}>
    <div className="shell" style={{ padding: "48px 32px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 40 }}>
      <div>
        <div className="wordmark" style={{ display: "block", marginBottom: 14 }}>Quiesce</div>
        <div className="meta" style={{ maxWidth: 28 + "ch" }}>
          A protocol for conditional asset release on Solana. Non-custodial. Audited by OtterSec, January 2026.
        </div>
      </div>
      <div>
        <div className="h-section" style={{ marginBottom: 14 }}>Protocol</div>
        <FooterLink>Whitepaper</FooterLink>
        <FooterLink>Audit reports</FooterLink>
        <FooterLink>On-chain program</FooterLink>
      </div>
      <div>
        <div className="h-section" style={{ marginBottom: 14 }}>Resources</div>
        <FooterLink>Documentation</FooterLink>
        <FooterLink>Integration guide</FooterLink>
        <FooterLink>PUSD</FooterLink>
      </div>
      <div>
        <div className="h-section" style={{ marginBottom: 14 }}>Contact</div>
        <div className="body-sm" style={{ color: "var(--ink-2)" }}>
          Quiesce Labs<br/>
          1 Pine Street, Suite 2400<br/>
          San Francisco, CA 94111<br/>
          <span className="addr" style={{ display: "inline-block", marginTop: 8 }}>desk@quiesce.xyz</span>
        </div>
      </div>
    </div>
    <div className="shell" style={{ padding: "24px 32px", borderTop: "1px solid var(--rule)", display: "flex", justifyContent: "space-between" }}>
      <div className="meta">© 2026 Quiesce Labs, Inc.</div>
      <div className="meta">Program ID <span className="addr" style={{ fontSize: 12 }}>QSCEvLT…7nWq</span></div>
    </div>
  </footer>
);
const FooterLink = ({ children }) => (
  <a href="#" style={{ display: "block", fontSize: 14, color: "var(--ink-2)", textDecoration: "none", padding: "4px 0" }}>
    {children}
  </a>
);

/* Status pip helper */
const Pip = ({ status, children }) => (
  <span className={`pip ${status}`}>{children}</span>
);

/* Small "back" link */
const BackLink = ({ onClick, children = "Back" }) => (
  <button
    onClick={onClick}
    style={{
      background: "transparent", border: "none", padding: 0, cursor: "pointer",
      fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)",
      letterSpacing: "0.02em",
    }}
  >
    ← {children}
  </button>
);

/* Section header used inside app pages */
const PageHeader = ({ eyebrow, title, meta, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "56px 0 28px", borderBottom: "1px solid var(--rule-2)" }}>
    <div>
      {eyebrow && <div className="h-section" style={{ marginBottom: 14 }}>{eyebrow}</div>}
      <div className="h-1">{title}</div>
      {meta && <div className="meta" style={{ marginTop: 12 }}>{meta}</div>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

Object.assign(window, { Wordmark, TopBar, Footer, FooterLink, Pip, BackLink, PageHeader });
