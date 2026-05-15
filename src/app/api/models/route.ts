import { NextResponse } from 'next/server';
import { listProviderInfo } from '@/lib/env';
import type { UserKeys } from '@/types';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  let userKeys: UserKeys | undefined;
  const headerKeys = req.headers.get('x-user-keys');
  if (headerKeys) {
    try {
      userKeys = JSON.parse(headerKeys) as UserKeys;
    } catch {
      // ignore malformed header
    }
  }
  const providers = await listProviderInfo(userKeys);
  return NextResponse.json({ providers });
}
