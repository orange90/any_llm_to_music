import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import {
  DEFAULT_QUOTA_EXCEEDED_MESSAGE,
  hasUserEndpoints,
  readDefaultLlmConfig,
} from '@/lib/env';
import { chatComplete } from '@/lib/llmClient';
import { STRUDEL_SYSTEM_PROMPT, buildUserMessage } from '@/lib/prompt';
import { extractCode, summarizeTitle } from '@/lib/strudel/extractCode';
import { defaultUsageRepo } from '@/lib/db';
import type { EndpointGenerateResult, GenerateResponse } from '@/types';

export const runtime = 'nodejs';

const EndpointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  baseURL: z.string().min(1).max(500),
  apiKey: z.string().min(1).max(500),
  model: z.string().min(1).max(200),
});

const BodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  endpoints: z.array(EndpointSchema).max(10).optional(),
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

  const { prompt, endpoints } = body;

  if (hasUserEndpoints(endpoints)) {
    const valid = endpoints.filter(
      (e) => e.apiKey.trim() && e.baseURL.trim() && e.model.trim(),
    );
    const results = await Promise.all(valid.map((ep) => runEndpoint(prompt, ep)));
    const response: GenerateResponse = { source: 'user', results };
    return NextResponse.json(response);
  }

  const def = readDefaultLlmConfig();
  if (!def) {
    return NextResponse.json(
      { error: '未配置默认 AI 接口，请在 Settings 中添加你自己的接口。' },
      { status: 400 },
    );
  }

  const usage = defaultUsageRepo.today();
  if (def.dailyLimit > 0 && usage.count >= def.dailyLimit) {
    return NextResponse.json(
      {
        error: DEFAULT_QUOTA_EXCEEDED_MESSAGE,
        quotaExceeded: true,
        defaultQuota: { limit: def.dailyLimit, used: usage.count, remaining: 0 },
      },
      { status: 429 },
    );
  }

  const next = defaultUsageRepo.increment();

  const result = await runEndpoint(prompt, {
    id: 'default',
    name: 'Default (官方)',
    baseURL: def.baseURL,
    apiKey: def.apiKey,
    model: def.model,
  });

  const response: GenerateResponse = {
    source: 'default',
    results: [result],
    defaultQuota: {
      limit: def.dailyLimit,
      used: next.count,
      remaining: Math.max(0, def.dailyLimit - next.count),
    },
  };
  return NextResponse.json(response);
}

async function runEndpoint(
  prompt: string,
  ep: { id: string; name: string; baseURL: string; apiKey: string; model: string },
): Promise<EndpointGenerateResult> {
  try {
    const raw = await chatComplete({
      systemPrompt: STRUDEL_SYSTEM_PROMPT,
      userPrompt: buildUserMessage(prompt),
      baseURL: ep.baseURL,
      apiKey: ep.apiKey,
      model: ep.model,
    });
    const code = extractCode(raw);
    if (!code) {
      return {
        endpointId: ep.id,
        endpointName: ep.name,
        model: ep.model,
        ok: false,
        raw,
        error: 'LLM 没有返回可执行代码',
      };
    }

    const track = {
      id: nanoid(),
      title: summarizeTitle(prompt),
      prompt,
      code,
      endpoint_name: ep.name,
      model: ep.model,
      created_at: Date.now(),
    };

    return {
      endpointId: ep.id,
      endpointName: ep.name,
      model: ep.model,
      ok: true,
      code,
      raw,
      track,
    };
  } catch (err) {
    return {
      endpointId: ep.id,
      endpointName: ep.name,
      model: ep.model,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
