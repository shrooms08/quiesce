"use client";

import { TopBar } from "@/components/chrome/TopBar";
import { BackLink } from "@/components/chrome/BackLink";
import { Pip } from "@/components/chrome/Pip";
import { fmtUSD } from "@/lib/format";

const ACTIVITY = [
  {
    date: "April 29, 2026",
    time: "12:04 PM PT",
    event: "Heartbeat check-in",
    actor: "0xA1B2…F4D9",
    note: "Tx confirmed at slot 287,418,392",
  },
  {
    date: "March 30, 2026",
    time: "09:17 AM PT",
    event: "Heartbeat check-in",
    actor: "0xA1B2…F4D9",
    note: "Tx confirmed at slot 282,104,008",
  },
  {
    date: "February 28, 2026",
    time: "07:42 PM PT",
    event: "Heartbeat check-in",
    actor: "0xA1B2…F4D9",
    note: "Tx confirmed at slot 276,801,221",
  },
  {
    date: "January 30, 2026",
    time: "11:55 AM PT",
    event: "Heartbeat check-in",
    actor: "0xA1B2…F4D9",
    note: "Tx confirmed at slot 271,514,440",
  },
  {
    date: "January 02, 2026",
    time: "03:20 PM PT",
    event: "Beneficiary contact updated",
    actor: "0xA1B2…F4D9",
    note: "Email changed",
  },
  {
    date: "December 12, 2025",
    time: "10:08 AM PT",
    event: "Vault deployed",
    actor: "0xA1B2…F4D9",
    note: "184,320.00 PUSD deposited",
  },
];

function VaultClock({
  progress,
  lastCheckin,
  nextDue,
  now,
  intervalDays,
}: {
  progress: number;
  lastCheckin: Date;
  nextDue: Date;
  now: Date;
  intervalDays: number;
}) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const daysLeft = Math.ceil((nextDue.getTime() - now.getTime()) / 86400000);

  return (
    <div>
      <div style={{ position: "relative", padding: "44px 0 56px" }}>
        <div style={{ position: "relative", height: 1, background: "var(--rule-2)" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: 1,
              width: `${progress * 100}%`,
              background: "var(--ink)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `${progress * 100}%`,
              top: -5,
              width: 10,
              height: 10,
              background: "var(--ink)",
              transform: "translateX(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: -3,
              width: 1,
              height: 7,
              background: "var(--ink-3)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -5,
              top: -5,
              width: 10,
              height: 10,
              background: "var(--paper)",
              border: "1px solid var(--ink)",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            fontSize: 11,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Last check-in
        </div>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            fontSize: 11,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            textAlign: "right",
          }}
        >
          Trigger
        </div>
        <div
          style={{ position: "absolute", left: 0, bottom: 0, fontSize: 12.5 }}
        >
          <span className="tnum">{fmt(lastCheckin)}</span>
        </div>
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            fontSize: 12.5,
            textAlign: "right",
          }}
        >
          <span className="tnum">{fmt(nextDue)}</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Now
          </div>
          <div className="tnum" style={{ fontSize: 12.5 }}>
            {fmt(now)}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 20,
          borderTop: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div>
          <div className="meta">Days remaining until trigger</div>
          <div
            className="serif tnum"
            style={{
              fontSize: 32,
              letterSpacing: "-0.012em",
              marginTop: 4,
            }}
          >
            {daysLeft}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="meta">Interval</div>
          <div className="tnum" style={{ fontSize: 16, marginTop: 4 }}>
            {intervalDays} days
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VaultDetailPage() {
  const lastCheckin = new Date("2026-04-29T19:04:00Z");
  const intervalDays = 90;
  const nextDue = new Date(
    lastCheckin.getTime() + intervalDays * 86400 * 1000
  );
  const now = new Date("2026-04-30T00:00:00Z");
  const elapsed = (now.getTime() - lastCheckin.getTime()) / 86400000;
  const progress = Math.min(1, Math.max(0, elapsed / intervalDays));

  return (
    <div data-screen-label="Vault detail">
      <TopBar mode="app" />

      <div className="shell" style={{ paddingBottom: 80 }}>
        <div style={{ paddingTop: 32 }}>
          <BackLink>Back to vaults</BackLink>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "32px 0 28px",
            borderBottom: "1px solid var(--rule-2)",
          }}
        >
          <div>
            <div className="h-section" style={{ marginBottom: 14 }}>
              Vault · v-aliyah · QSCe…7nWq
            </div>
            <div className="h-1">Aliyah — primary inheritance</div>
            <div
              style={{ marginTop: 16, display: "flex", gap: 24, alignItems: "center" }}
            >
              <Pip status="armed">Armed</Pip>
              <span className="meta">
                Deployed December 12, 2025 · 139 days ago
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="h-section" style={{ marginBottom: 8 }}>
              Held
            </div>
            <div
              className="serif tnum"
              style={{ fontSize: 40, letterSpacing: "-0.018em" }}
            >
              {fmtUSD(184320.0)}
            </div>
            <div className="meta" style={{ marginTop: 4 }}>
              PUSD · non-freezable
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            padding: "48px 0",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <div>
            <div className="h-section" style={{ marginBottom: 16 }}>
              Condition
            </div>
            <div
              className="serif"
              style={{
                fontSize: 22,
                lineHeight: 1.45,
                color: "var(--ink)",
                maxWidth: "44ch",
              }}
            >
              If{" "}
              <span style={{ borderBottom: "1px dotted var(--ink-3)" }}>
                90 consecutive days
              </span>{" "}
              pass without a check-in, release{" "}
              <span className="tnum">100%</span> of the balance to{" "}
              <span className="addr" style={{ fontSize: 17 }}>
                0xA1B2…F4D9
              </span>
              , designated <em style={{ fontStyle: "italic" }}>Aliyah Okafor</em>.
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button
                className="btn btn-accent"
                onClick={() => console.log("Check in (mock)")}
              >
                Check in
              </button>
              <button
                className="btn-ghost btn"
                onClick={() => console.log("Modify (mock)")}
              >
                Modify
              </button>
              <button
                className="btn-quiet"
                onClick={() => console.log("Cancel vault (mock)")}
              >
                Cancel vault
              </button>
            </div>
            <div className="meta" style={{ marginTop: 18, maxWidth: "48ch" }}>
              Check-in is a single signed transaction. Network fee ≈ 0.00005 SOL.
            </div>
          </div>

          <div>
            <div className="h-section" style={{ marginBottom: 16 }}>
              Heartbeat clock
            </div>
            <VaultClock
              progress={progress}
              lastCheckin={lastCheckin}
              nextDue={nextDue}
              now={now}
              intervalDays={intervalDays}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            padding: "48px 0",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <div>
            <div className="h-section" style={{ marginBottom: 18 }}>
              Beneficiary
            </div>
            <dl className="dl" style={{ gridTemplateColumns: "150px 1fr" }}>
              <dt>Label</dt>
              <dd>Aliyah Okafor</dd>
              <dt>Address</dt>
              <dd className="addr" style={{ fontSize: 13 }}>
                0xA1B2C3D4E5F60718293A4B5C6D7E8F9012F4D9
              </dd>
              <dt>Notification</dt>
              <dd>aliyah@example.com</dd>
              <dt>Notice on release</dt>
              <dd>Email + on-chain memo</dd>
            </dl>
          </div>
          <div>
            <div className="h-section" style={{ marginBottom: 18 }}>
              Parameters
            </div>
            <dl className="dl" style={{ gridTemplateColumns: "180px 1fr" }}>
              <dt>Trigger</dt>
              <dd>Missed heartbeat · 90 days</dd>
              <dt>Last check-in</dt>
              <dd className="tnum">April 29, 2026 · 12:04 PM PT</dd>
              <dt>Next required by</dt>
              <dd className="tnum">July 28, 2026 · 12:04 PM PT</dd>
              <dt>Release fraction</dt>
              <dd className="tnum">100%</dd>
              <dt>Reversibility</dt>
              <dd>None after release</dd>
            </dl>
          </div>
        </div>

        <div style={{ padding: "48px 0 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 18,
            }}
          >
            <div className="h-section">Activity</div>
            <a
              href="#"
              className="meta"
              style={{ color: "var(--ink-2)", textDecoration: "none" }}
            >
              Export →
            </a>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 200 }}>Date</th>
                <th>Event</th>
                <th>Actor</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITY.map((a, i) => (
                <tr key={i}>
                  <td>
                    <div className="tnum" style={{ fontSize: 14 }}>
                      {a.date}
                    </div>
                    <div className="meta" style={{ marginTop: 4 }}>
                      {a.time}
                    </div>
                  </td>
                  <td>{a.event}</td>
                  <td>
                    <span className="addr">{a.actor}</span>
                  </td>
                  <td>
                    <span className="meta">{a.note}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
