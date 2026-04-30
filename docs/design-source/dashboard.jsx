/* Quiesce — Dashboard (vault list, bank-statement style) */

const VAULTS = [
  {
    id: "v-aliyah",
    name: "Aliyah — primary inheritance",
    beneficiary: { label: "Aliyah Okafor", addr: "0xA1B2…F4D9" },
    amount: 184320.00,
    condition: "Heartbeat · 90 days",
    status: "armed",
    statusLabel: "Armed",
    nextAction: "Check in by May 28, 2026",
    nextDays: 29,
  },
  {
    id: "v-trust-2027",
    name: "Family trust — 2027 distribution",
    beneficiary: { label: "Three beneficiaries", addr: "Multi" },
    amount: 1250000.00,
    condition: "Date · January 1, 2027",
    status: "dormant",
    statusLabel: "Dormant",
    nextAction: "—",
    nextDays: null,
  },
  {
    id: "v-escrow-pinegrove",
    name: "Pinegrove acquisition escrow",
    beneficiary: { label: "Pinegrove Holdings", addr: "0x7C09…21A4" },
    amount: 480000.00,
    condition: "Oracle · Pyth title transfer",
    status: "dormant",
    statusLabel: "Dormant",
    nextAction: "Awaiting oracle",
    nextDays: null,
  },
  {
    id: "v-grant-noor",
    name: "Noor — research grant vesting",
    beneficiary: { label: "Noor Haidari", addr: "0x44E1…0B2C" },
    amount: 36000.00,
    condition: "Vesting · monthly · 24 mo",
    status: "armed",
    statusLabel: "Releasing",
    nextAction: "Next release May 1, 2026",
    nextDays: 2,
  },
  {
    id: "v-emergency",
    name: "Emergency fund — partner access",
    beneficiary: { label: "Maya Okafor", addr: "0xD2F3…918E" },
    amount: 75000.00,
    condition: "Co-signer · 2 of 3",
    status: "warning",
    statusLabel: "Action required",
    nextAction: "Co-signer pending review",
    nextDays: 4,
  },
  {
    id: "v-sunset",
    name: "Sunset clause — long dormant",
    beneficiary: { label: "Charity: Open Philanthropy", addr: "0xCC11…7700" },
    amount: 50000.00,
    condition: "Heartbeat · 365 days",
    status: "dormant",
    statusLabel: "Dormant",
    nextAction: "Check in by Dec 12, 2026",
    nextDays: 227,
  },
];

const fmtUSD = (n) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Dashboard = ({ setView, openVault }) => {
  const totalHeld = VAULTS.reduce((s, v) => s + v.amount, 0);
  return (
    <div data-screen-label="Dashboard">
      <TopBar view="dashboard" setView={setView} mode="app" />

      <div className="shell" style={{ paddingBottom: 80 }}>
        <PageHeader
          eyebrow="Account · 0xA1B2…F4D9"
          title="Vaults"
          meta={`${VAULTS.length} active · last sync 12:04 PM PT`}
          action={
            <button className="btn" onClick={() => setView("create")}>
              Create vault
            </button>
          }
        />

        {/* Summary band — three numbers, no cards, hairline-separated */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid var(--rule-2)" }}>
          <SummaryCell label="Total held" value={`${fmtUSD(totalHeld)} PUSD`} />
          <SummaryCell label="Active vaults" value={String(VAULTS.length)} />
          <SummaryCell label="Heartbeats due (30d)" value="2" />
          <SummaryCell label="Released to date" value={`${fmtUSD(0)} PUSD`} muted />
        </div>

        {/* Vault table */}
        <table className="table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Vault</th>
              <th>Beneficiary</th>
              <th className="num">Amount</th>
              <th>Condition</th>
              <th>Status</th>
              <th>Next action</th>
            </tr>
          </thead>
          <tbody>
            {VAULTS.map((v) => (
              <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => openVault(v.id)}>
                <td>
                  <div style={{ color: "var(--ink)", fontSize: 15 }}>{v.name}</div>
                  <div className="meta" style={{ marginTop: 4 }}>{v.id}</div>
                </td>
                <td>
                  <div style={{ color: "var(--ink)", fontSize: 14.5 }}>{v.beneficiary.label}</div>
                  <div className="addr" style={{ marginTop: 4 }}>{v.beneficiary.addr}</div>
                </td>
                <td className="num">
                  <span className="tnum" style={{ fontSize: 15 }}>{fmtUSD(v.amount)}</span>
                  <span className="meta" style={{ marginLeft: 6 }}>PUSD</span>
                </td>
                <td>
                  <div style={{ fontSize: 14 }}>{v.condition}</div>
                </td>
                <td>
                  <Pip status={v.status}>{v.statusLabel}</Pip>
                </td>
                <td>
                  <div style={{ fontSize: 14 }}>{v.nextAction}</div>
                  {v.nextDays !== null && v.nextDays <= 30 && (
                    <div className="meta" style={{ marginTop: 4, color: v.nextDays <= 7 ? "var(--accent)" : "var(--ink-3)" }}>
                      in {v.nextDays} {v.nextDays === 1 ? "day" : "days"}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footnote */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--rule)", display: "flex", justifyContent: "space-between" }}>
          <div className="meta">
            All amounts denominated in PUSD. Vault state synchronized from Solana mainnet, slot 287,418,392.
          </div>
          <div className="meta">
            <a href="#" style={{ color: "var(--ink-2)", textDecoration: "none" }}>Export statement →</a>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCell = ({ label, value, muted }) => (
  <div style={{ padding: "26px 0 24px", borderRight: "1px solid var(--rule)" }}>
    <div className="h-section" style={{ marginBottom: 12, fontSize: 10.5 }}>{label}</div>
    <div className="serif tnum" style={{ fontSize: 28, color: muted ? "var(--ink-3)" : "var(--ink)", letterSpacing: "-0.012em" }}>
      {value}
    </div>
  </div>
);

Object.assign(window, { Dashboard, VAULTS, fmtUSD });
