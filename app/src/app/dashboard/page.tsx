"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { TopBar } from "@/components/chrome/TopBar";
import { PageHeader } from "@/components/chrome/PageHeader";
import { Pip, type PipStatus } from "@/components/chrome/Pip";
import { FaucetBanner } from "@/components/FaucetBanner";
import { fmtUSD, truncateAddress } from "@/lib/format";
import { MOCK_PUSD_DECIMALS } from "@/lib/constants";
import { useUserVaults, type OnChainVault } from "@/hooks/useUserVaults";
import { useUserPusdBalance } from "@/hooks/useUserPusdBalance";
import { BeneficiarySection } from "@/components/BeneficiarySection";

type DisplayVault = {
  key: string;
  vaultId: string;
  name: string;
  beneficiaryAddr: string;
  amount: number;
  condition: string;
  status: PipStatus;
  statusLabel: string;
  nextAction: string;
  nextDays: number | null;
};

const PUSD_SCALE = 10 ** MOCK_PUSD_DECIMALS;

function formatInterval(seconds: bigint): string {
  const s = Number(seconds);
  if (s >= 86400) {
    const days = Math.round(s / 86400);
    return `Heartbeat · ${days} ${days === 1 ? "day" : "days"}`;
  }
  if (s >= 3600) {
    const hours = Math.round(s / 3600);
    return `Heartbeat · ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  const mins = Math.max(1, Math.round(s / 60));
  return `Heartbeat · ${mins} ${mins === 1 ? "minute" : "minutes"}`;
}

function formatDateLong(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toDisplay(v: OnChainVault, nowSec: number): DisplayVault {
  const expiry = Number(v.lastHeartbeat) + Number(v.heartbeatInterval);
  const expired = nowSec > expiry;

  let status: PipStatus;
  let statusLabel: string;
  let nextAction: string;
  let nextDays: number | null;

  if (v.status === "active") {
    if (expired) {
      status = "warning";
      statusLabel = "Triggered";
      nextAction = "Heartbeat expired — anyone may claim";
      nextDays = null;
    } else {
      status = "armed";
      statusLabel = "Armed";
      nextAction = `Check in by ${formatDateLong(expiry)}`;
      nextDays = Math.ceil((expiry - nowSec) / 86400);
    }
  } else if (v.status === "claimed") {
    status = "released";
    statusLabel = "Released";
    nextAction = "—";
    nextDays = null;
  } else {
    status = "dormant";
    statusLabel = "Cancelled";
    nextAction = "—";
    nextDays = null;
  }

  return {
    key: v.publicKey.toBase58(),
    vaultId: v.vaultId.toString(),
    name: v.name || `Vault #${v.vaultId.toString()}`,
    beneficiaryAddr: truncateAddress(v.beneficiary.toBase58()),
    amount: Number(v.amount) / PUSD_SCALE,
    condition: formatInterval(v.heartbeatInterval),
    status,
    statusLabel,
    nextAction,
    nextDays,
  };
}

function SummaryCell({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div style={{ padding: "26px 0 24px", borderRight: "1px solid var(--rule)" }}>
      <div className="h-section" style={{ marginBottom: 12, fontSize: 10.5 }}>
        {label}
      </div>
      <div
        className="serif tnum"
        style={{
          fontSize: 28,
          color: muted ? "var(--ink-3)" : "var(--ink)",
          letterSpacing: "-0.012em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "80px 0", borderBottom: "1px solid var(--rule)" }}>
      <p
        className="body"
        style={{ margin: 0, marginBottom: 20, color: "var(--ink)" }}
      >
        No vaults yet. Create your first vault to begin.
      </p>
      <Link href="/vaults/new" className="btn">
        Create vault
      </Link>
      <div className="meta" style={{ marginTop: 16, color: "var(--ink-2)" }}>
        Or{" "}
        <Link href="/agent" style={{ color: "var(--accent)" }}>
          describe what you want to a Quiesce agent
        </Link>{" "}
        →
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { wallets } = useSolanaWallets();
  const address = wallets[0]?.address;
  const { vaults, isLoading } = useUserVaults();
  const { balance: pusdBalanceBaseUnits } = useUserPusdBalance();
  const walletPusd =
    pusdBalanceBaseUnits !== null
      ? Number(pusdBalanceBaseUnits) / PUSD_SCALE
      : null;

  const nowSec = Math.floor(Date.now() / 1000);
  const display = vaults.map((v) => toDisplay(v, nowSec));

  const activeVaults = vaults.filter((v) => v.status === "active");
  const totalHeld = activeVaults.reduce(
    (s, v) => s + Number(v.amount) / PUSD_SCALE,
    0
  );
  const heartbeatsDue30d = activeVaults.filter((v) => {
    const expiry = Number(v.lastHeartbeat) + Number(v.heartbeatInterval);
    const remaining = expiry - nowSec;
    return remaining > 0 && remaining < 30 * 86400;
  }).length;
  const releasedToDate = vaults
    .filter((v) => v.status === "claimed")
    .reduce((s, v) => s + Number(v.amount) / PUSD_SCALE, 0);

  const metaText = isLoading
    ? "Loading from Solana devnet…"
    : `${activeVaults.length} active · ${vaults.length} total`;
  const metaLine = (
    <>
      <div>{metaText}</div>
      {walletPusd !== null && (
        <div style={{ marginTop: 4, color: "var(--ink-2)" }}>
          Wallet · {fmtUSD(walletPusd)} PUSD
        </div>
      )}
    </>
  );

  return (
    <div data-screen-label="Dashboard">
      <TopBar mode="app" />

      <div className="shell" style={{ paddingBottom: 80 }}>
        <PageHeader
          eyebrow={address ? `Account · ${truncateAddress(address)}` : undefined}
          title="Vaults"
          meta={metaLine}
          action={
            <Link href="/vaults/new" className="btn">
              Create vault
            </Link>
          }
        />

        <FaucetBanner />

        <div
          className="summary-grid"
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            borderBottom: "1px solid var(--rule-2)",
          }}
        >
          <SummaryCell
            label="Total held"
            value={`${fmtUSD(totalHeld)} PUSD`}
          />
          <SummaryCell
            label="Active vaults"
            value={String(activeVaults.length)}
          />
          <SummaryCell
            label="Heartbeats due (30d)"
            value={String(heartbeatsDue30d)}
          />
          <SummaryCell
            label="Released to date"
            value={`${fmtUSD(releasedToDate)} PUSD`}
            muted={releasedToDate === 0}
          />
        </div>

        {!isLoading && vaults.length === 0 ? (
          <EmptyState />
        ) : (
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
              {display.map((v) => (
                <tr
                  key={v.key}
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/vaults/${v.key}`)}
                >
                  <td>
                    <div style={{ color: "var(--ink)", fontSize: 15 }}>
                      {v.name}
                    </div>
                    <div className="meta" style={{ marginTop: 4 }}>
                      #{v.vaultId}
                    </div>
                  </td>
                  <td>
                    <div className="addr">{v.beneficiaryAddr}</div>
                  </td>
                  <td className="num">
                    <span className="tnum" style={{ fontSize: 15 }}>
                      {fmtUSD(v.amount)}
                    </span>
                    <span className="meta" style={{ marginLeft: 6 }}>
                      PUSD
                    </span>
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
                      <div
                        className="meta"
                        style={{
                          marginTop: 4,
                          color:
                            v.nextDays <= 7
                              ? "var(--accent)"
                              : "var(--ink-3)",
                        }}
                      >
                        in {v.nextDays} {v.nextDays === 1 ? "day" : "days"}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <BeneficiarySection />

        <div
          className="responsive-stack"
          style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: "1px solid var(--rule)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div className="meta">
            All amounts denominated in PUSD. Vault state synchronized from
            Solana devnet.
          </div>
          <div className="meta">
            <a
              href="#"
              style={{ color: "var(--ink-2)", textDecoration: "none" }}
            >
              Export statement →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
