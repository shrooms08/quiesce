"use client";

import { TopBar } from "@/components/chrome/TopBar";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { QUIESCE_PROGRAM_ID, MOCK_PUSD_MINT } from "@/lib/constants";

const GITHUB_URL = "https://github.com/shrooms08/quiesce";

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        background: "var(--paper-2)",
        padding: "28px 26px",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        className="serif"
        style={{ fontSize: 28, color: "var(--ink-3)", lineHeight: 1 }}
      >
        {number}
      </div>
      <div
        className="serif"
        style={{
          fontSize: 18,
          color: "var(--ink)",
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      <p
        className="body-sm"
        style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.55 }}
      >
        {body}
      </p>
    </div>
  );
}

export default function LandingPage() {
  const { authenticated, login } = usePrivy();
  const router = useRouter();

  const handleLaunch = () => {
    if (authenticated) {
      router.push("/dashboard");
    } else {
      login();
    }
  };

  const handleAgent = () => {
    if (authenticated) {
      router.push("/agent");
    } else {
      login();
    }
  };

  return (
    <div data-screen-label="Landing">
      <TopBar mode="marketing" />

      {/* Hero */}
      <section className="shell" style={{ padding: "140px 32px 120px" }}>
        <div style={{ maxWidth: 980 }}>
          <div className="h-section" style={{ marginBottom: 28 }}>
            Programmable on-chain inheritance · Solana · PUSD
          </div>
          <h1 className="h-display">
            Quiesce. The protocol for
            <br />
            what comes after.
          </h1>
          <p
            className="body"
            style={{ marginTop: 36, maxWidth: "62ch", fontSize: 18 }}
          >
            A vault owner deposits PUSD and commits to a heartbeat — a
            check-in cadence. While they keep checking in, the vault is
            dormant. If they stop, anyone can release the full balance to the
            named beneficiary on the next confirmed block. Quiesce holds no
            keys and cannot intervene.
          </p>
          <div
            style={{
              marginTop: 44,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button className="btn btn-accent" onClick={handleLaunch}>
              Launch app
            </button>
            <a
              className="btn btn-ghost"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <hr className="hr-strong" />

      {/* How it works — four-step horizontal sequence */}
      <section className="shell" style={{ padding: "120px 32px 40px" }}>
        <div className="editorial-pair" style={{ marginBottom: 56 }}>
          <div className="h-section">How it works</div>
          <p
            className="body"
            style={{ fontSize: 19, color: "var(--ink)", maxWidth: "52ch", margin: 0 }}
          >
            Four steps. The owner sets terms, keeps checking in, then —
            either by their own choice or by missing a check-in — the vault
            settles. Each transition is on-chain, witnessable, and final.
          </p>
        </div>
        <div className="howitworks-grid">
          <Step
            number="01"
            title="Set up the vault."
            body="Owner deposits PUSD, names a beneficiary, and configures a heartbeat — a check-in cadence they commit to."
          />
          <Step
            number="02"
            title="Check in to keep it dormant."
            body="While the owner heartbeats on schedule, the vault is theirs. They can cancel any time and recover the funds."
          />
          <Step
            number="03"
            title="Heartbeat expires."
            body="If they stop checking in, the trigger window opens. The owner can no longer cancel."
          />
          <Step
            number="04"
            title="Anyone releases the funds."
            body="A permissionless claim transfers the full balance atomically to the named beneficiary. Quiesce holds no keys and cannot intervene."
          />
        </div>
      </section>

      {/* Why PUSD specifically */}
      <section className="shell" style={{ padding: "120px 32px 40px" }}>
        <div className="editorial-pair">
          <div className="h-section">Why PUSD specifically</div>
          <div>
            <p className="body" style={{ marginTop: 0, maxWidth: "52ch" }}>
              Most stablecoins — USDC, USDT — ship with a freeze authority.
              The issuer can disable a token account at will. That capability
              defeats the point of an inheritance protocol: a bequest must
              execute when its conditions are met, regardless of jurisdiction,
              sanctions exposure, or institutional pressure.
            </p>
            <p className="body" style={{ marginTop: 20, maxWidth: "52ch" }}>
              PUSD has no freeze function, no blacklist, no pause mechanism.
              Once issued, the tokens are governed entirely by the on-chain
              logic that holds them. That is what makes Quiesce&apos;s
              settlement guarantee a property of the protocol, not a marketing
              claim.
            </p>
          </div>
        </div>
      </section>

      {/* Inheritance angle */}
      <section className="shell" style={{ padding: "120px 32px 40px" }}>
        <div className="editorial-pair">
          <div className="h-section">Built for inheritance that has to work</div>
          <div>
            <p className="body" style={{ marginTop: 0, maxWidth: "52ch" }}>
              Inheritance carries religious weight in Islamic finance —
              <em> wasiyyah</em> is a core obligation, and the $3T Islamic
              finance market has no native digital inheritance infrastructure.
              PUSD is the first major Shariah-compliant stablecoin. Quiesce
              fits that market structurally.
            </p>
            <p className="body" style={{ marginTop: 20, maxWidth: "52ch" }}>
              It is not only for Islamic finance. Crypto-native families,
              executors, and anyone with assets to bequeath under conditional
              logic can use the same protocol on the same terms.
            </p>
          </div>
        </div>
      </section>

      {/* Agent CTA */}
      <section className="shell" style={{ padding: "120px 32px 40px" }}>
        <div className="editorial-pair">
          <div className="h-section">Try the agent</div>
          <div>
            <p
              className="body"
              style={{
                marginTop: 0,
                maxWidth: "52ch",
                fontSize: 19,
                color: "var(--ink)",
              }}
            >
              Quiesce ships with a conversational agent that helps you set up
              vaults, find ones designated for you, and answer questions about
              the protocol.
            </p>
            <div style={{ marginTop: 28 }}>
              <button className="btn" onClick={handleAgent}>
                Open the agent
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Status / footer */}
      <footer
        style={{
          borderTop: "1px solid var(--rule)",
          marginTop: 120,
        }}
      >
        <div className="shell status-grid" style={{ padding: "48px 32px" }}>
          <div>
            <div
              className="wordmark"
              style={{ display: "block", marginBottom: 14 }}
            >
              Quiesce
            </div>
            <div className="meta" style={{ maxWidth: "44ch" }}>
              Hackathon submission · Palm USD side track of the Frontier
              Hackathon · April 2026.
            </div>
            <div className="meta" style={{ marginTop: 10, maxWidth: "44ch" }}>
              Built by Minos.
            </div>
          </div>
          <div>
            <div className="h-section" style={{ marginBottom: 14 }}>
              On-chain · devnet
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div className="meta" style={{ marginBottom: 4 }}>
                  Program
                </div>
                <div className="addr" style={{ wordBreak: "break-all" }}>
                  {QUIESCE_PROGRAM_ID}
                </div>
              </div>
              <div>
                <div className="meta" style={{ marginBottom: 4 }}>
                  Mock PUSD mint
                </div>
                <div className="addr" style={{ wordBreak: "break-all" }}>
                  {MOCK_PUSD_MINT}
                </div>
              </div>
              <div style={{ marginTop: 6 }}>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{
                    fontSize: 14,
                    color: "var(--ink-2)",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  github.com/shrooms08/quiesce
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
