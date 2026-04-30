/* Quiesce — Beneficiary claim view.
   The screen someone sees after conditions have triggered.
   Calm, dignified, written like a letter. No celebration. */

const Claim = ({ setView }) => {
  return (
    <div data-screen-label="Beneficiary claim" style={{ minHeight: "100vh", background: "var(--paper)" }}>
      {/* Quiet top — wordmark only, no nav */}
      <header style={{ padding: "32px", borderBottom: "1px solid var(--rule)" }}>
        <div className="topbar-inner">
          <Wordmark onClick={() => setView("landing")} />
          <div className="meta">Notice of release · April 29, 2026</div>
        </div>
      </header>

      <div className="shell-narrow" style={{ paddingTop: 96, paddingBottom: 120 }}>
        {/* Eyebrow */}
        <div className="h-section" style={{ marginBottom: 28 }}>
          For Aliyah Okafor
        </div>

        {/* Headline — letter-like, restrained */}
        <h1 className="serif" style={{
          fontSize: "clamp(40px, 4.6vw, 60px)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          fontWeight: 400,
          margin: 0,
          maxWidth: "20ch",
        }}>
          A vault designated for you is now ready to be claimed.
        </h1>

        {/* Body — written as a short note, not marketing copy */}
        <div style={{ marginTop: 56, maxWidth: "60ch" }}>
          <p className="body" style={{ fontSize: 18, color: "var(--ink)" }}>
            On December 12, 2025, <strong style={{ fontWeight: 500 }}>Marcus Okafor</strong> deposited PUSD into a Quiesce vault and named you as its sole beneficiary. The vault was set to release if ninety days passed without a check-in from his key.
          </p>
          <p className="body" style={{ marginTop: 22, fontSize: 18, color: "var(--ink)" }}>
            That interval has now elapsed. The vault is open. The funds below are yours to claim at a time of your choosing — there is no deadline and no pressure to act today.
          </p>
        </div>

        {/* Quiet hairline */}
        <hr className="hr-strong" style={{ margin: "72px 0 0" }} />

        {/* Statement of what is being received — bank-statement formality */}
        <div style={{ padding: "48px 0 56px", borderBottom: "1px solid var(--rule-2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
            <div>
              <div className="h-section" style={{ marginBottom: 14 }}>Amount</div>
              <div className="serif tnum" style={{ fontSize: 56, lineHeight: 1, letterSpacing: "-0.022em" }}>
                {fmtUSD(184320.00)}
              </div>
              <div className="meta" style={{ marginTop: 10 }}>PUSD · non-freezable</div>
            </div>
            <div>
              <dl className="dl" style={{ gridTemplateColumns: "150px 1fr" }}>
                <dt>From</dt>
                <dd>
                  Marcus Okafor
                  <div className="addr" style={{ marginTop: 4 }}>0x7E91…3C2A</div>
                </dd>
                <dt>Vault</dt>
                <dd>Aliyah — primary inheritance</dd>
                <dt>Designation made</dt>
                <dd className="tnum">December 12, 2025</dd>
                <dt>Released</dt>
                <dd className="tnum">April 29, 2026 · 12:04 PM PT</dd>
                <dt>Reference</dt>
                <dd className="addr" style={{ fontSize: 12.5 }}>QSCe7nWq…aV29</dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Note from the depositor, if attached */}
        <div style={{ padding: "56px 0", borderBottom: "1px solid var(--rule-2)" }}>
          <div className="h-section" style={{ marginBottom: 22 }}>
            A note was left with this vault
          </div>
          <blockquote style={{
            margin: 0,
            paddingLeft: 28,
            borderLeft: "1px solid var(--ink-3)",
            maxWidth: "58ch",
          }}>
            <p className="serif" style={{
              fontSize: 22, lineHeight: 1.5, color: "var(--ink)", margin: 0,
              fontStyle: "italic", letterSpacing: "-0.005em",
            }}>
              "If you're reading this, it means I haven't checked in for a while. Don't read too much into the timing — I set this up years ago and updated it every spring. Take what you need. Take your time. — M."
            </p>
          </blockquote>
        </div>

        {/* The action — modest, single button */}
        <div style={{ padding: "64px 0 0" }}>
          <div className="h-section" style={{ marginBottom: 18 }}>To claim</div>
          <p className="body" style={{ fontSize: 17, maxWidth: "58ch" }}>
            Connect a Solana wallet that controls the address <span className="addr" style={{ fontSize: 14 }}>0xA1B2…F4D9</span>. The transfer is a single signed transaction. Quiesce takes a 0.10% protocol fee on release; the remainder is sent to your wallet on the next confirmed block.
          </p>

          <div style={{ marginTop: 36, display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn btn-accent">Connect wallet to claim</button>
            <button className="btn-ghost btn">Save for later</button>
          </div>
          <div className="meta" style={{ marginTop: 22, maxWidth: "56ch" }}>
            There is no deadline. The vault remains open indefinitely. If you would prefer to involve an executor, attorney, or trusted family member, the vault address and reference above are sufficient for them to verify the release on-chain.
          </div>
        </div>

        {/* Verification block — quiet, like a footer of a legal doc */}
        <div style={{ marginTop: 96, paddingTop: 32, borderTop: "1px solid var(--rule)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 40 }}>
          <div>
            <div className="h-section" style={{ marginBottom: 8, fontSize: 10 }}>Verification</div>
            <div className="meta" style={{ color: "var(--ink-2)" }}>
              This release is recorded at slot 287,418,392 on Solana mainnet. Anyone can verify the transaction independently.
            </div>
          </div>
          <div>
            <div className="h-section" style={{ marginBottom: 8, fontSize: 10 }}>Custody</div>
            <div className="meta" style={{ color: "var(--ink-2)" }}>
              Quiesce never held these funds. The vault released them directly from the on-chain program to the address you control.
            </div>
          </div>
          <div>
            <div className="h-section" style={{ marginBottom: 8, fontSize: 10 }}>Assistance</div>
            <div className="meta" style={{ color: "var(--ink-2)" }}>
              If you need help — technical or otherwise — write to <span className="addr">desk@quiesce.xyz</span>. We respond within one business day.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Claim });
