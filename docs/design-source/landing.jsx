/* Quiesce — Landing page */

const Landing = ({ setView }) => {
  return (
    <div data-screen-label="Landing">
      <TopBar view="landing" setView={setView} mode="marketing" />

      {/* Hero */}
      <section className="shell" style={{ padding: "140px 32px 120px" }}>
        <div style={{ maxWidth: 980 }}>
          <div className="h-section" style={{ marginBottom: 28 }}>
            A protocol for conditional asset release · Solana
          </div>
          <h1 className="h-display">
            Quiesce. The protocol for<br/>what comes after.
          </h1>
          <p className="body" style={{ marginTop: 36, maxWidth: "62ch", fontSize: 18 }}>
            PUSD held in programmable vaults on Solana. Dormant by design. Released only when the conditions you set are met &mdash; a missed check-in, a date, an oracle, a co-signer. We hold nothing. We cannot freeze it. We cannot reach in.
          </p>
          <div style={{ marginTop: 44, display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn btn-accent" onClick={() => setView("dashboard")}>
              Launch app
            </button>
            <button className="btn btn-ghost">Read the whitepaper</button>
          </div>
        </div>
      </section>

      <hr className="hr-strong" />

      {/* The mechanism — three editorial blocks */}
      <section className="shell" style={{ padding: "120px 32px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.2fr", gap: 80, alignItems: "start" }}>
          <div>
            <div className="h-section">The mechanism</div>
          </div>
          <div>
            <p className="body" style={{ fontSize: 19, color: "var(--ink)", maxWidth: "52ch" }}>
              You deposit PUSD into a vault and write its release conditions. The vault then waits. Quiesce holds no keys, takes no custody, and cannot intervene. When the conditions evaluate true on-chain, the vault releases to the address you named.
            </p>
            <p className="body" style={{ marginTop: 20, maxWidth: "52ch" }}>
              The vault is patient by construction. It costs nothing to wait. It will wait longer than you will.
            </p>
          </div>
        </div>
      </section>

      {/* Three use cases — editorial blocks separated by hairlines, not cards */}
      <section className="shell" style={{ padding: "100px 32px 0" }}>
        <UseCase
          number="i."
          eyebrow="Inheritance"
          title="A vault that opens only after silence."
          body="Set a heartbeat — a check-in cadence you commit to. If you miss it for the duration you specify, the vault releases to the people you've named. There is no third party to petition. The chain is the executor."
          example="If 90 days pass without a check-in, release 100% to 0xA1B2…F4D9."
        />
        <UseCase
          number="ii."
          eyebrow="Escrow"
          title="Held against a condition, not a counterparty."
          body="Funds held until a specific event clears — an oracle confirmation, a co-signer's signature, a date. Two-party arrangements without a custodian in the middle, settled by code rather than discretion."
          example="Release 50,000 PUSD to seller upon Pyth oracle confirmation of title transfer."
        />
        <UseCase
          number="iii."
          eyebrow="Vesting"
          title="Schedules that cannot be edited mid-stream."
          body="Recurring releases on a fixed cadence to a fixed beneficiary. Useful for grants, retainers, multi-year payouts, and anywhere the stability of the schedule is the product."
          example="Release 8,333.33 PUSD on the first of each month for thirty-six months."
        />
      </section>

      {/* Constraint statement — quietly anchors trust */}
      <section className="shell" style={{ padding: "140px 32px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.2fr", gap: 80, alignItems: "start" }}>
          <div className="h-section">What we cannot do</div>
          <div>
            <ConstraintRow>
              We cannot freeze a vault. PUSD is non-freezable. Once deposited, the funds are governed entirely by the conditions you wrote.
            </ConstraintRow>
            <ConstraintRow>
              We cannot reverse a release. When conditions evaluate true, the transfer is final on the next block.
            </ConstraintRow>
            <ConstraintRow>
              We cannot recover keys. There is no support channel that returns access. If you need recovery, design it into the vault as a co-signer or a successor key.
            </ConstraintRow>
            <ConstraintRow last>
              We cannot upgrade the program against you. The on-chain program is immutable. New versions are opt-in by deploying a new vault.
            </ConstraintRow>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const UseCase = ({ number, eyebrow, title, body, example }) => (
  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1.1fr", gap: 64, padding: "56px 0", borderTop: "1px solid var(--rule-2)" }}>
    <div>
      <div className="serif" style={{ fontSize: 36, color: "var(--ink-3)", lineHeight: 1 }}>{number}</div>
      <div className="h-section" style={{ marginTop: 18 }}>{eyebrow}</div>
    </div>
    <div>
      <div className="h-2">{title}</div>
    </div>
    <div>
      <p className="body" style={{ marginTop: 0 }}>{body}</p>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--rule)" }}>
        <div className="meta" style={{ marginBottom: 6 }}>EXAMPLE CONDITION</div>
        <div className="addr" style={{ color: "var(--ink)", fontSize: 13.5, lineHeight: 1.5 }}>
          {example}
        </div>
      </div>
    </div>
  </div>
);

const ConstraintRow = ({ children, last }) => (
  <div style={{ padding: "22px 0", borderBottom: last ? "none" : "1px solid var(--rule)" }}>
    <p className="body" style={{ margin: 0, maxWidth: "62ch" }}>{children}</p>
  </div>
);

Object.assign(window, { Landing });
