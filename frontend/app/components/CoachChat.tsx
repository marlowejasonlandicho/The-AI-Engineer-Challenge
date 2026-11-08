"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";

type Role = "user" | "coach";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

const STARTERS = [
  "I feel scattered and I don't know where to start.",
  "Help me restart a habit I dropped.",
  "I have a hard conversation coming up.",
];

/**
 * FastAPI accepts one `message` and does not remember earlier turns.
 * Folding the visible thread into that field lets the coach follow a
 * conversation without a backend change.
 */
function buildRequestMessage(history: ChatMessage[], latest: string): string {
  if (history.length === 0) {
    return latest;
  }

  const transcript = history
    .map((item) => `${item.role === "user" ? "User" : "Coach"}: ${item.content}`)
    .join("\n\n");

  return `Conversation so far:\n${transcript}\n\nLatest message from me:\n${latest}`;
}

function errorMessage(payload: unknown, status: number): string {
  const detail =
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
      ? payload.detail
      : "";

  // Never surface a leaked key if an upstream error echoes one.
  const safeDetail = detail.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]");

  if (status === 500 && safeDetail.toLowerCase().includes("openai_api_key")) {
    return "The coach is up, but OPENAI_API_KEY is not set in the shell that started the backend.";
  }

  if (safeDetail) {
    return safeDetail;
  }

  return `The coach returned an unexpected response (${status}).`;
}

export default function CoachChat() {
  const inputId = useId();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, error]);

  useEffect(() => {
    if (draft === "" && fieldRef.current) {
      fieldRef.current.style.height = "auto";
    }
  }, [draft]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current) {
      return;
    }

    sendingRef.current = true;

    const history = messages;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: buildRequestMessage(history, trimmed),
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(errorMessage(payload, response.status));
        return;
      }

      const reply =
        payload &&
        typeof payload === "object" &&
        "reply" in payload &&
        typeof payload.reply === "string"
          ? payload.reply.trim()
          : "";

      if (!reply) {
        setError("The coach replied, but the message was empty.");
        return;
      }

      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "coach", content: reply },
      ]);
    } catch {
      setError(
        "I couldn't reach the coach. From the project root, run uv run uvicorn api.index:app --reload, then try again.",
      );
    } finally {
      sendingRef.current = false;
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="overflow-hidden rounded-3xl bg-sky-deep text-white shadow-lg shadow-sky-deep/15">
        <div className="h-1.5 bg-orange" />
        <div className="flex flex-col gap-3 px-6 py-6 sm:px-8 sm:py-7">
          <p className="text-sm font-bold tracking-[0.16em] text-sky uppercase">
            Supportive mental coach
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Steady
            </h1>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setError(null);
                }}
                className="rounded-full border border-white/30 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
              >
                New chat
              </button>
            )}
          </div>
          <p className="max-w-xl text-base leading-7 text-sky">
            Talk through stress, habits, motivation, or a wobbly bit of
            confidence. Steady keeps the thread on this page and asks the
            FastAPI coach for each reply.
          </p>
        </div>
      </header>

      <section
        className="mt-4 flex flex-1 flex-col rounded-3xl border border-white/80 bg-paper shadow-xl shadow-sky-deep/10"
        aria-label="Conversation"
      >
        <div className="flex flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
          {messages.length === 0 && !pending && (
            <div className="flex flex-col gap-4 rounded-2xl bg-cream px-5 py-5">
              <p className="text-lg font-extrabold text-ink">
                What would you like to work through?
              </p>
              <p className="text-base leading-7 text-ink-soft">
                Pick a starting point, or write your own. There is no account
                and nothing is saved after you leave this page.
              </p>
              <div className="flex flex-col gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void send(starter)}
                    className="rounded-2xl border border-line bg-paper px-4 py-3 text-left text-base leading-6 font-semibold text-ink transition hover:border-orange hover:bg-orange/5"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ol className="flex flex-col gap-3" aria-live="polite">
            {messages.map((message) => (
              <li
                key={message.id}
                className={
                  message.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <article
                  className={
                    message.role === "user"
                      ? "w-fit max-w-[85%] rounded-2xl rounded-br-md bg-orange px-4 py-3 text-white"
                      : "w-fit max-w-[85%] rounded-2xl rounded-bl-md border border-sky bg-sky/40 px-4 py-3 text-ink"
                  }
                >
                  <p className="mb-1 text-xs font-extrabold tracking-wide uppercase opacity-80">
                    {message.role === "user" ? "You" : "Steady"}
                  </p>
                  <p className="text-base leading-7 whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </article>
              </li>
            ))}
          </ol>

          {pending && (
            <p className="w-fit rounded-2xl border border-sky bg-sky/40 px-4 py-3 text-sm font-bold text-ink-soft">
              Steady is thinking…
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-orange/40 bg-cream px-4 py-3 text-sm leading-6 font-semibold text-ink"
            >
              {error}
            </p>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 flex items-end gap-2 border-t border-sky/80 bg-paper px-4 py-4 sm:px-6"
        >
          <label htmlFor={inputId} className="sr-only">
            Message Steady
          </label>
          <textarea
            id={inputId}
            ref={fieldRef}
            value={draft}
            rows={1}
            disabled={pending}
            placeholder="Tell Steady what's going on"
            onChange={(event) => {
              setDraft(event.target.value);
              const field = event.currentTarget;
              field.style.height = "auto";
              field.style.height = `${field.scrollHeight}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
            className="composer-input min-h-12 flex-1 resize-none rounded-2xl border border-sky-deep/15 bg-sky/30 px-4 py-3 text-base leading-6 text-ink outline-none placeholder:text-ink-soft/70 focus:border-orange focus:bg-paper disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || draft.trim().length === 0}
            className="h-12 shrink-0 rounded-2xl bg-orange px-5 text-base font-extrabold text-white transition hover:bg-orange-deep disabled:cursor-not-allowed disabled:bg-orange/40"
          >
            Send
          </button>
        </form>
      </section>

      <p className="mt-4 px-1 text-sm leading-6 text-ink-soft">
        Steady is a practice coach for this project, not medical care. If you
        are in crisis, contact local emergency services or a crisis line.
      </p>
    </div>
  );
}
