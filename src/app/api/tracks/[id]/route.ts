import { NextResponse } from 'next/server';
import { tracksRepo } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const track = tracksRepo.get(params.id);
  if (!track) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ track });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = tracksRepo.delete(params.id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
