"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TopBar } from "@/components/chrome/TopBar";
import { PageHeader } from "@/components/chrome/PageHeader";
import { ProposalCard } from "@/components/agent/ProposalCard";
import type { VaultProposal } from "@/lib/agent/types";

type Role = "user" | "assistant" | "system";

type Message = {
  id: string;
  role: Role;
  content: string;
  proposal?: VaultProposal | null;
};

const SUGGESTED_PROMPTS = [
  "What is Quiesce?",
  "How does the heartbeat work?",
  "Why PUSD specifically?",
];

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  // Auto-grow textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 8 * 22; // approx 8 rows of 22px line-height
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, [input]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: newId(),
      role: "user",
      content: trimmed,
    };
    const nextThread = [...messages, userMsg];
    setMessages(nextThread);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextThread
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "system",
            content: data?.error ?? `Request failed (${res.status}).`,
          },
        ]);
        return;
      }
      const reply = data?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "system",
            content: "Received an empty response from the agent.",
          },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: reply,
          proposal: (data?.proposal ?? null) as VaultProposal | null,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "system",
          content: e instanceof Error ? e.message : String(e),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function onTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd+Enter (mac) or Ctrl+Enter (others) sends.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send(input);
    }
  }

  function onChipClick(prompt: string) {
    setInput(prompt);
    textareaRef.current?.focus();
  }

  function handleProposalSigned(signature: string, vaultPda: string) {
    const sigShort = `${signature.slice(0, 8)}…${signature.slice(-8)}`;
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "assistant",
        content:
          `Vault created. [View it →](/vaults/${vaultPda})\n\n` +
          `Transaction: [${sigShort}](https://explorer.solana.com/tx/${signature}?cluster=devnet)`,
      },
    ]);
  }

  return (
    <div data-screen-label="Agent">
      <TopBar mode="app" />

      <div
        className="shell"
        style={{
          paddingBottom: 32,
          minHeight: "calc(100vh - 76px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <PageHeader title="Agent" meta="Conversational interface for Quiesce." />

        <div
          ref={threadRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 0 24px",
            minHeight: "50vh",
          }}
        >
          {messages.length === 0 ? (
            <EmptyState onChip={onChipClick} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onProposalSigned={handleProposalSigned}
                />
              ))}
              {isLoading && (
                <div className="meta" style={{ color: "var(--ink-3)" }}>
                  Thinking…
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--rule)",
            padding: "20px 0 24px",
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          <textarea
            ref={textareaRef}
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onTextareaKeyDown}
            disabled={isLoading}
            placeholder="Ask about Quiesce, describe a vault, or check if you're a beneficiary."
            rows={3}
            style={{
              flex: 1,
              fontFamily: "var(--sans)",
              fontSize: 15,
              lineHeight: 1.55,
              resize: "none",
              borderBottom: "1px solid var(--rule-2)",
              padding: "10px 0",
            }}
          />
          <button
            className="btn btn-accent"
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            style={{
              opacity: isLoading || !input.trim() ? 0.5 : 1,
              alignSelf: "flex-end",
            }}
          >
            {isLoading ? "Sending…" : "Send"}
          </button>
        </div>
        <div
          className="meta"
          style={{ color: "var(--ink-3)", paddingBottom: 16 }}
        >
          ⌘+Enter (or Ctrl+Enter) to send. Conversation lives in this tab only —
          refresh clears it.
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onChip }: { onChip: (prompt: string) => void }) {
  return (
    <div style={{ paddingTop: 48 }}>
      <div className="h-2" style={{ marginBottom: 28 }}>
        Start a conversation.
      </div>
      <p
        className="body"
        style={{ marginTop: 0, marginBottom: 32, maxWidth: "60ch" }}
      >
        Ask about how vaults work, describe an inheritance arrangement you have
        in mind, or learn what makes PUSD a fit for guaranteed-settlement
        protocols. The agent has read access to Quiesce&apos;s domain
        knowledge; on-chain tools (reading your vaults, preparing transactions)
        will be added in a follow-up.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChip(p)}
            className="btn btn-ghost btn-sm"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onProposalSigned,
}: {
  message: Message;
  onProposalSigned: (signature: string, vaultPda: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: "80%",
            background: "var(--paper-2)",
            border: "1px solid var(--rule)",
            borderRadius: 6,
            padding: "12px 16px",
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--ink)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "system") {
    return (
      <div
        style={{
          alignSelf: "flex-start",
          maxWidth: "80%",
          padding: "12px 16px",
          border: "1px solid var(--rule-2)",
          borderLeft: "3px solid var(--accent)",
          background: "var(--paper-2)",
          fontSize: 13.5,
          color: "var(--ink)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <div className="h-section" style={{ marginBottom: 4 }}>
          Error
        </div>
        {message.content}
      </div>
    );
  }

  // assistant
  return (
    <div style={{ marginRight: "8%" }}>
      <div
        className="agent-md"
        style={{
          fontSize: 15.5,
          lineHeight: 1.6,
          color: "var(--ink)",
          wordBreak: "break-word",
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              if (href && href.startsWith("/")) {
                return <Link href={href}>{children}</Link>;
              }
              return (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      {message.proposal && (
        <ProposalCard
          proposal={message.proposal}
          onSigned={onProposalSigned}
        />
      )}
    </div>
  );
}
