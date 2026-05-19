import OpenAI from 'openai';

export interface LlmCallOpts {
  systemPrompt: string;
  userPrompt: string;
  baseURL: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

function buildClient(apiKey: string, baseURL: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: baseURL.replace(/\/+$/, ''),
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'any_llm_to_music',
    },
  });
}

export async function chatComplete(opts: LlmCallOpts): Promise<string> {
  const { systemPrompt, userPrompt, baseURL, apiKey, model, maxTokens = 2048, signal } = opts;
  const client = buildClient(apiKey, baseURL);
  const res = await client.chat.completions.create(
    {
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    { signal },
  );
  return res.choices[0]?.message?.content?.trim() ?? '';
}

export async function chatPing(opts: {
  baseURL: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}): Promise<{ ok: boolean; reply?: string; message?: string }> {
  try {
    const reply = await chatComplete({
      systemPrompt: 'You are a connectivity test. Reply with the single word: pong.',
      userPrompt: 'ping',
      baseURL: opts.baseURL,
      apiKey: opts.apiKey,
      model: opts.model,
      maxTokens: 8,
      signal: opts.signal,
    });
    return { ok: true, reply: reply || '(empty reply)' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
