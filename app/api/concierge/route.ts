import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are naya Concierge. Help college students shop second-hand.
Be concise, practical, and friendly. Focus on fit, quality, price fairness, and styling ideas.
Ask 1-2 clarifying questions if needed (budget, size, occasion, climate).
When asked about price, suggest a reasonable range and mention factors that affect value.
Offer 1-2 outfit formulas or shopping checklists when relevant. Use short bullets.`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OpenRouter API key.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://naya.app',
        'X-Title': 'naya concierge',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-r1-0528:free',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.6,
        max_tokens: 400,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'OpenRouter request failed', detail: errorText },
        { status: 500 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.replace(/^data:\s*/, '');
            if (data === '[DONE]') {
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(delta);
              }
            } catch {
              // ignore invalid JSON chunks
            }
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Concierge error', detail: String(error) },
      { status: 500 }
    );
  }
}
