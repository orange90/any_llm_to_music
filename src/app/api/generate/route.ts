import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getProvider } from '@/lib/providers';
import { resolveCredentials } from '@/lib/env';
import { STRUDEL_SYSTEM_PROMPT, buildUserMessage } from '@/lib/prompt';
import { extractCode, summarizeTitle } from '@/lib/strudel/extractCode';
import { tracksRepo } from '@/lib/db';

export const runtime = 'nodejs';

const BodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  provider: z.enum(['anthropic', 'openai', 'openrouter']),
  model: z.string().min(1).max(200),
  userKeys: z
    .object({
      anthropic: z.object({ apiKey: z.string().optional(), baseURL: z.string().optional() }).optional(),
      openai: z.object({ apiKey: z.string().optional(), baseURL: z.string().optional() }).optional(),
      openrouter: z.object({ apiKey: z.string().optional(), baseURL: z.string().optional() }).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    body = BodySchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body', details: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const { prompt, provider: providerId, model, userKeys } = body;

  let creds;
  try {
    creds = resolveCredentials(providerId, userKeys);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No credentials' },
      { status: 400 },
    );
  }

  const provider = getProvider(providerId);

  let raw: string;
  try {
    raw = await provider.generate({
      systemPrompt: STRUDEL_SYSTEM_PROMPT,
      userPrompt: buildUserMessage(prompt),
      model,
      apiKey: creds.apiKey,
      baseURL: creds.baseURL,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'LLM call failed';
    return NextResponse.json({ error: `LLM error: ${message}` }, { status: 502 });
  }

  const code = extractCode(raw);
  if (!code) {
    return NextResponse.json({ error: 'LLM returned no code', raw }, { status: 502 });
  }

  const track = tracksRepo.create({
    id: nanoid(),
    title: summarizeTitle(prompt),
    prompt,
    code,
    provider: providerId,
    model,
  });

  return NextResponse.json({ code, raw, track });
}
