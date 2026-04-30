"use client";

import { useState } from "react";
import { TopBar } from "@/components/chrome/TopBar";
import { BackLink } from "@/components/chrome/BackLink";
import { fmtUSD } from "@/lib/format";

function Step({
  number,
  eyebrow,
  title,
  children,
}: {
  number: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 48,
        padding: "72px 0",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div>
        <div
          className="serif"
          style={{
            fontSize: 32,
            color: "var(--ink-3)",
            lineHeight: 1,
            letterSpacing: "0.01em",
          }}
        >
          {number}
        </div>
        <div className="h-section" style={{ marginTop: 18 }}>
          {eyebrow}
        </div>
      </div>
      <div>
        <h2 className="h-2" style={{ marginTop: 0, marginBottom: 18 }}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ConditionRow({
  selected,
  onSelect,
  title,
  desc,
  last,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        textAlign: "left",
        background: selected ? "var(--paper-2)" : "transparent",
        border: "none",
        borderBottom: last
          ? "1px solid var(--rule-2)"
          : "1px solid var(--rule)",
        padding: "22px 20px",
        cursor: "pointer",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        fontFamily: "inherit",
        transition: "background-color 150ms ease",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "1px solid var(--ink-3)",
          background: selected ? "var(--ink)" : "transparent",
          boxShadow: selected ? "inset 0 0 0 2px var(--paper-2)" : "none",
          marginTop: 5,
          flexShrink: 0,
        }}
      />
      <span>
        <span
          style={{
            display: "block",
            fontSize: 15,
            color: "var(--ink)",
            fontWeight: 500,
          }}
        >
          {title}
        </span>
        <span
          className="body-sm"
          style={{ display: "block", marginTop: 4, color: "var(--ink-3)" }}
        >
          {desc}
        </span>
      </span>
    </button>
  );
}

function Ack({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "10px 0",
      }}
    >
      <input
        type="checkbox"
        defaultChecked
        style={{ marginTop: 4, accentColor: "var(--accent)" }}
      />
      <span className="body-sm" style={{ color: "var(--ink-2)" }}>
        {children}
      </span>
    </label>
  );
}

export default function CreateVaultPage() {
  const [name, setName] = useState("Aliyah — secondary inheritance");
  const [amount, setAmount] = useState("50000");
  const [conditionType, setConditionType] = useState("heartbeat");
  const [interval, setInterval] = useState("90");
  const [beneficiaryLabel, setBeneficiaryLabel] = useState("Aliyah Okafor");
  const [beneficiaryAddr, setBeneficiaryAddr] = useState(
    "0xA1B2C3D4E5F60718293A4B5C6D7E8F9012F4D9"
  );
  const [submitted, setSubmitted] = useState(false);

  const amountNum = Number(amount.replace(/,/g, "")) || 0;

  const handleSubmit = () => {
    const formValues = {
      name,
      amount: amountNum,
      conditionType,
      interval,
      beneficiaryLabel,
      beneficiaryAddr,
    };
    console.log("Vault form values (mock submission):", formValues);
    setSubmitted(true);
  };

  return (
    <div data-screen-label="Create vault">
      <TopBar mode="app" />

      <div className="shell-narrow" style={{ paddingBottom: 80 }}>
        <div style={{ paddingTop: 32 }}>
          <BackLink>Back to vaults</BackLink>
        </div>

        <div style={{ padding: "32px 0 28px", borderBottom: "1px solid var(--rule-2)" }}>
          <div className="h-section" style={{ marginBottom: 14 }}>
            New vault
          </div>
          <div className="h-1">
            Set the conditions under which this vault will release.
          </div>
          <p className="body" style={{ marginTop: 18, fontSize: 16 }}>
            Each section below is part of a single vault definition. Once
            submitted, the vault is deployed to Solana and the conditions become
            immutable. Modifications afterward require deploying a new vault.
          </p>
        </div>

        {submitted && (
          <div
            className="inset"
            style={{
              marginTop: 28,
              padding: "20px 24px",
              fontSize: 14,
              color: "var(--ink)",
            }}
          >
            Vault created (mock). Form values printed to the console; on-chain
            submission is wired in a later step.
          </div>
        )}

        <Step number="01" eyebrow="Identification" title="Name the vault.">
          <p className="body body-sm" style={{ marginBottom: 24 }}>
            For your own reference. Beneficiaries will see this name when they
            receive notice. Choose something they will recognize.
          </p>
          <Field label="Vault name">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </Step>

        <Step number="02" eyebrow="Deposit" title="The amount of PUSD to hold.">
          <p className="body body-sm" style={{ marginBottom: 24 }}>
            Funds are transferred from your wallet on submission. PUSD is
            non-freezable; once deposited, it is governed entirely by the
            conditions you set below.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <Field label="Amount">
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  borderBottom: "1px solid var(--rule-2)",
                  paddingBottom: 10,
                }}
              >
                <input
                  className="input tnum"
                  style={{
                    borderBottom: "none",
                    padding: "12px 0 0",
                    fontSize: 22,
                    flex: 1,
                  }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="meta" style={{ marginLeft: 8, fontSize: 13 }}>
                  PUSD
                </span>
              </div>
              <div className="help">
                Wallet balance: <span className="tnum">241,084.12</span> PUSD
              </div>
            </Field>
            <Field label="Source">
              <div style={{ paddingTop: 10 }}>
                <div className="addr" style={{ fontSize: 14, color: "var(--ink)" }}>
                  0xA1B2…F4D9
                </div>
                <div className="help">Connected wallet · Phantom</div>
              </div>
            </Field>
          </div>
        </Step>

        <Step number="03" eyebrow="Condition" title="What unlocks the vault.">
          <p className="body body-sm" style={{ marginBottom: 28 }}>
            Choose the trigger that will release funds. Each is evaluated
            on-chain. Conditions can be combined in advanced mode; the common
            configurations are below.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              borderTop: "1px solid var(--rule-2)",
            }}
          >
            <ConditionRow
              selected={conditionType === "heartbeat"}
              onSelect={() => setConditionType("heartbeat")}
              title="Missed heartbeat"
              desc="Vault releases if you do not check in within a set interval."
            />
            <ConditionRow
              selected={conditionType === "date"}
              onSelect={() => setConditionType("date")}
              title="Date passes"
              desc="Vault releases at a specific calendar date and time."
            />
            <ConditionRow
              selected={conditionType === "oracle"}
              onSelect={() => setConditionType("oracle")}
              title="Oracle signal"
              desc="Vault releases when a Pyth or Switchboard feed crosses a threshold."
            />
            <ConditionRow
              selected={conditionType === "cosigner"}
              onSelect={() => setConditionType("cosigner")}
              title="Co-signer approval"
              desc="Vault releases on signatures from a quorum of designated keys."
              last
            />
          </div>

          {conditionType === "heartbeat" && (
            <div
              style={{
                marginTop: 36,
                paddingTop: 28,
                borderTop: "1px solid var(--rule)",
              }}
            >
              <Field label="Interval (days)">
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <input
                    className="input tnum"
                    style={{ width: 120, fontSize: 22 }}
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                  />
                  <span className="meta">days between required check-ins</span>
                </div>
                <div className="help">
                  You will be notified at 14, 7, 3, and 1 day(s) before the
                  interval lapses. Notifications are independent of the on-chain
                  logic.
                </div>
              </Field>
            </div>
          )}
        </Step>

        <Step number="04" eyebrow="Beneficiary" title="Who receives the release.">
          <p className="body body-sm" style={{ marginBottom: 28 }}>
            The destination address is final. Add a label and a contact for your
            records — these are stored encrypted off-chain and surfaced to the
            beneficiary at the time of release.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <Field label="Label (private)">
              <input
                className="input"
                value={beneficiaryLabel}
                onChange={(e) => setBeneficiaryLabel(e.target.value)}
              />
            </Field>
            <Field label="Notification email (optional)">
              <input className="input" placeholder="aliyah@example.com" />
            </Field>
          </div>
          <div style={{ marginTop: 24 }}>
            <Field label="Solana address">
              <input
                className="input addr"
                style={{ fontSize: 14 }}
                value={beneficiaryAddr}
                onChange={(e) => setBeneficiaryAddr(e.target.value)}
              />
              <div className="help">
                Verify carefully. Releases to incorrect addresses cannot be
                reversed.
              </div>
            </Field>
          </div>
        </Step>

        <Step number="05" eyebrow="Review" title="Read this before signing.">
          <p className="body body-sm" style={{ marginBottom: 28 }}>
            The following summarizes the vault you are about to deploy. The
            on-chain transaction is final once signed.
          </p>

          <div className="inset" style={{ padding: "32px 36px" }}>
            <div
              className="serif"
              style={{
                fontSize: 20,
                color: "var(--ink)",
                lineHeight: 1.45,
                maxWidth: "62ch",
              }}
            >
              I deposit{" "}
              <span className="tnum">{fmtUSD(amountNum)} PUSD</span> into a vault
              designated <em style={{ fontStyle: "italic" }}>&quot;{name}&quot;</em>. If{" "}
              <span style={{ borderBottom: "1px dotted var(--ink-3)" }}>
                {interval} consecutive days
              </span>{" "}
              pass without a check-in transaction signed by my key, the vault
              releases its full balance to{" "}
              <span className="addr" style={{ fontSize: 16 }}>
                {beneficiaryAddr.slice(0, 6)}…{beneficiaryAddr.slice(-4)}
              </span>
              , designated{" "}
              <em style={{ fontStyle: "italic" }}>{beneficiaryLabel}</em>.
            </div>
            <div
              style={{
                marginTop: 28,
                paddingTop: 24,
                borderTop: "1px solid var(--rule)",
              }}
            >
              <div className="h-section" style={{ marginBottom: 14 }}>
                Acknowledgements
              </div>
              <Ack>
                I understand Quiesce holds no keys to this vault and cannot
                reverse a release.
              </Ack>
              <Ack>
                I understand the on-chain program is immutable and will not be
                upgraded against me.
              </Ack>
              <Ack>
                I understand I am responsible for the heartbeat schedule. Missed
                check-ins will trigger release.
              </Ack>
            </div>
          </div>

          <div style={{ marginTop: 40 }}>
            <div className="h-section" style={{ marginBottom: 14 }}>
              Transaction
            </div>
            <dl className="dl">
              <dt>Vault address</dt>
              <dd className="addr">QSCe…(generated on submission)</dd>
              <dt>Network</dt>
              <dd>Solana mainnet-beta</dd>
              <dt>Network fee</dt>
              <dd className="tnum">≈ 0.00012 SOL</dd>
              <dt>Protocol fee</dt>
              <dd>None at deposit. 0.10% on release.</dd>
              <dt>Estimated confirmation</dt>
              <dd>~ 12 seconds</dd>
            </dl>
          </div>

          <div style={{ marginTop: 48, display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn btn-accent" onClick={handleSubmit}>
              Sign and submit
            </button>
            <BackLink>Cancel</BackLink>
            <span className="meta" style={{ marginLeft: 8 }}>
              Wallet will request one signature.
            </span>
          </div>
        </Step>
      </div>
    </div>
  );
}
