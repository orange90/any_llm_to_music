import { NextResponse } from 'next/server';
import { z } from 'zod';
import { chatPing } from '@/lib/llmClient';
import type { TestEndpointResponse } from '@/types';

export const runtime = 'nodejs';

const BodySchema = z.object({
  baseURL: z.string().min(1).max(500),
  apiKey: z.string().min(1).max(500),
  model: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    body = BodySchema.parse(json);
  } catch (err) {
    const resp: TestEndpointResponse = {
      ok: false,
      message: '参数无效: ' + (err instanceof Error ? err.message : String(err)),
    };
    return NextResponse.json(resp, { status: 400 });
  }

  const started = Date.now();
  const result = await chatPing(body);
  const latencyMs = Date.now() - started;

  const resp: TestEndpointResponse = {
    ok: result.ok,
    latencyMs,
    message: result.message,
    reply: result.reply,
  };
  return NextResponse.json(resp, { status: result.ok ? 200 : 502 });
}
