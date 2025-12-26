import { NextResponse } from 'next/server';
import { readSbActionsFile, writeSbActionsFile } from '@/lib/sb-store';

export async function GET() {
  try {
    const data = await readSbActionsFile();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load sb actions.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    await writeSbActionsFile(body);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save sb actions.' },
      { status: 500 }
    );
  }
}
