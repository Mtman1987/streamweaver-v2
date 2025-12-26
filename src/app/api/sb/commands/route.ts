import { NextResponse } from 'next/server';
import { readSbCommandsFile, writeSbCommandsFile } from '@/lib/sb-store';

export async function GET() {
  try {
    const data = await readSbCommandsFile();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load sb commands.' },
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

    await writeSbCommandsFile(body);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save sb commands.' },
      { status: 500 }
    );
  }
}
