'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ConciergeChat() {
  const router = useRouter();
  const starterMessages: Message[] = useMemo(
    () => [
      {
        role: 'assistant',
        content:
          'Hi! Ask me about fit, quality, price, or what to wear for class, parties, or interviews.',
      },
    ],
    []
  );
  const [messages, setMessages] = useState<Message[]>([
    ...starterMessages,
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didHydratePrompt = useRef(false);
  const promptChips = [
    'Is this a fair price for vintage Levi’s 501s?',
    'What should I wear to a campus interview?',
    'How should a vintage sweatshirt fit?',
    'Build me a party outfit under $40.',
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('conciergeMessages');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (err) {
        console.error('Failed to load concierge history', err);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('conciergeMessages', JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const detail =
          errorPayload?.detail || errorPayload?.error || 'Concierge response failed';
        throw new Error(detail);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream.');
      }

      let assistantText = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = { ...last, content: assistantText };
          }
          return next;
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Concierge is unavailable.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    await sendMessage(input);
  };

  const handleReset = () => {
    setMessages(starterMessages);
    setInput('');
    setError(null);
  };

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (didHydratePrompt.current) return;
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get('prompt');
    if (!prompt) return;
    didHydratePrompt.current = true;
    setInput(prompt);
    sendMessage(prompt);
  }, [messages]);

  return (
    <div className="border border-black/10 bg-white p-8 text-left">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">
          concierge chat
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="text-[11px] font-semibold uppercase tracking-[0.3em] text-text-secondary transition-opacity hover:opacity-70"
        >
          clear chat
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {promptChips.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setInput(prompt)}
            className="rounded-full border border-black/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-text-muted transition-all hover:border-black/30 hover:text-text-primary"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
              message.role === 'assistant'
                ? 'border-black/10 bg-night-bg text-text-secondary'
                : 'border-black/20 bg-white text-text-primary'
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              {message.role === 'assistant' ? 'n' : 'u'}
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted">
                {message.role === 'assistant' ? 'concierge' : 'you'}
              </p>
              <div className="mt-2 space-y-3 text-sm leading-relaxed text-text-primary">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p>{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-text-primary">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => (
                    <ul className="list-disc space-y-2 pl-5">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal space-y-2 pl-5">{children}</ol>
                  ),
                  li: ({ children }) => <li>{children}</li>,
                  h1: ({ children }) => (
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
                      {children}
                    </p>
                  ),
                  h2: ({ children }) => (
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
                      {children}
                    </p>
                  ),
                  h3: ({ children }) => (
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
                      {children}
                    </p>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-night-bg px-4 py-3 text-sm text-text-secondary">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              n
            </div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted">
              concierge is thinking…
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-xs uppercase tracking-[0.24em] text-accent-orange">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about fit, quality, or price..."
          className="w-full border-b border-black/30 bg-transparent px-0 py-3 text-sm uppercase tracking-[0.28em] text-text-primary placeholder:text-text-muted focus:border-orange-glow focus:outline-none"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="border-b border-orange-glow text-[11px] font-semibold uppercase tracking-[0.32em] text-orange-glow transition-all hover:border-orange-accent hover:text-orange-accent disabled:opacity-40"
        >
          {loading ? 'thinking…' : 'send'}
        </button>
      </div>

      {lastUserMessage && (
        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-black/10 pt-4 text-xs uppercase tracking-[0.22em] text-text-muted">
          <span>Search listings for:</span>
          <button
            type="button"
            onClick={() =>
              router.push(`/?q=${encodeURIComponent(lastUserMessage.content)}&platform=all`)
            }
            className="border-b border-black text-[11px] font-semibold uppercase tracking-[0.3em] text-black transition-opacity hover:opacity-70"
          >
            {lastUserMessage.content} →
          </button>
        </div>
      )}
    </div>
  );
}
