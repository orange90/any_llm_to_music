import { NextResponse } from 'next/server';
import { tracksRepo } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const tracks = tracksRepo.list(100);
  return NextResponse.json({ tracks });
}
