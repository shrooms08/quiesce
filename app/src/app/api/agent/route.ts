import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { QUIESCE_SYSTEM_PROMPT } from "@/lib/agent/systemPrompt";
import { TOOLS, executeToolCall } from "@/lib/agent/tools";
import type { VaultProposal } from "@/lib/agent/types";

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1024;
const MAX_ITERATIONS = 5;

type ChatMessage = { role: "user" | "assistant"; content: string };

function loadClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to app/.env.local."
    );
  }
  return new Anthropic({ apiKey });
}

function isChatMessage(x: unknown): x is ChatMessage {
  return (
    typeof x === "object" &&
    x !== null &&
    "role" in x &&
    "content" in x &&
    (((x as { role: unknown }).role === "user") ||
      ((x as { role: unknown }).role === "assistant")) &&
    typeof (x as { content: unknown }).content === "string"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { messages?: unknown }).messages)
  ) {
    return NextResponse.json(
      { error: "Body must include a non-empty `messages` array." },
      { status: 400 }
    );
  }

  const incoming = (body as { messages: unknown[] }).messages;
  if (incoming.length === 0) {
    return NextResponse.json(
      { error: "`messages` must be non-empty." },
      { status: 400 }
    );
  }
  if (!incoming.every(isChatMessage)) {
    return NextResponse.json(
      {
        error:
          "Each message must have role: 'user' | 'assistant' and content: string.",
      },
      { status: 400 }
    );
  }
  const lastMessage = incoming[incoming.length - 1];
  if (lastMessage.role !== "user") {
    return NextResponse.json(
      { error: "The last message must be from the user." },
      { status: 400 }
    );
  }

  let client: Anthropic;
  try {
    client = loadClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  // Internal conversation history — may include tool_use / tool_result blocks.
  // Anthropic's MessageParam allows content to be a string or a block array.
  const conversation: Anthropic.MessageParam[] = (incoming as ChatMessage[]).map(
    (m) => ({ role: m.role, content: m.content })
  );

  // The most recent successful propose_create_vault payload across all iterations
  // of this user turn. If the model emits multiple, the last one wins.
  let lastProposal: VaultProposal | null = null;

  try {
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: QUIESCE_SYSTEM_PROMPT,
        tools: TOOLS,
        messages: conversation,
      });

      if (response.stop_reason === "tool_use") {
        // Persist the assistant turn (it contains the tool_use blocks the model just produced).
        conversation.push({
          role: "assistant",
          content: response.content,
        });

        // Execute every tool_use block in this assistant turn and return all results
        // in a single user turn (Anthropic requires all tool_results for one assistant
        // turn to be in the immediately-following user turn).
        const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          let result: string;
          try {
            result = await executeToolCall(
              block.name,
              block.input as Record<string, unknown>
            );
          } catch (err) {
            result = JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            });
          }
          toolResultBlocks.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });

          // If this was a successful propose_create_vault, capture the proposal
          // so we can surface it on the final API response.
          if (block.name === "propose_create_vault") {
            try {
              const parsed = JSON.parse(result);
              if (parsed && parsed.success === true && parsed.kind === "create_vault") {
                lastProposal = {
                  kind: "create_vault",
                  params: parsed.params,
                  summary: parsed.summary,
                };
              }
            } catch {
              // ignore — handler returned malformed JSON, treat as no proposal
            }
          }
        }
        conversation.push({
          role: "user",
          content: toolResultBlocks,
        });
        continue;
      }

      // end_turn (or any non-tool stop) — extract final text and return.
      let text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();

      // Defensive fallback: if the model produced a successful proposal but
      // returned no introductory text, supply a default. The system prompt
      // should make this rare; the fallback covers edge cases.
      if (!text && lastProposal) {
        text =
          "I've prepared the vault. Review the details below and sign to create it.";
      }

      if (!text) {
        return NextResponse.json(
          { error: "Model returned an empty response." },
          { status: 500 }
        );
      }
      return NextResponse.json({
        message: { role: "assistant" as const, content: text },
        proposal: lastProposal,
      });
    }

    return NextResponse.json(
      {
        error: `Tool loop exceeded ${MAX_ITERATIONS} iterations without a final response.`,
      },
      { status: 500 }
    );
  } catch (err) {
    const status =
      err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    const message =
      err instanceof Anthropic.APIError
        ? `Anthropic API error (${err.status}): ${err.message}`
        : err instanceof Error
        ? err.message
        : String(err);
    return NextResponse.json({ error: message }, { status });
  }
}
