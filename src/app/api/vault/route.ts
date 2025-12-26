import { NextRequest, NextResponse } from 'next/server';
import { readVault, updateVault } from '@/lib/vault-store';

export async function GET() {
  try {
    const vault = await readVault();
    return NextResponse.json({ vault });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // We intentionally only accept non-token config here.
    const patch: any = {};
    if (body.obs && typeof body.obs === 'object') {
      patch.obs = {
        ip: typeof body.obs.ip === 'string' ? body.obs.ip.trim() : undefined,
        port: body.obs.port !== undefined ? Number(body.obs.port) : undefined,
        password: typeof body.obs.password === 'string' ? body.obs.password : undefined,
      };
      if (patch.obs.port !== undefined && (!Number.isFinite(patch.obs.port) || patch.obs.port <= 0)) {
        return NextResponse.json({ error: 'Invalid OBS port' }, { status: 400 });
      }
    }

    if (body.websocket && typeof body.websocket === 'object') {
      patch.websocket = {
        host: typeof body.websocket.host === 'string' ? body.websocket.host.trim() : undefined,
        port: body.websocket.port !== undefined ? Number(body.websocket.port) : undefined,
      };
      if (patch.websocket.port !== undefined && (!Number.isFinite(patch.websocket.port) || patch.websocket.port <= 0)) {
        return NextResponse.json({ error: 'Invalid WebSocket port' }, { status: 400 });
      }
    }

    if (body.points && typeof body.points === 'object') {
      const points: Record<string, number> = {};
      for (const [key, val] of Object.entries(body.points)) {
        if (typeof key !== 'string') continue;
        const num = Number(val);
        if (!Number.isFinite(num)) continue;
        points[key] = num;
      }
      patch.points = points;
    }

    const vault = await updateVault(patch);
    return NextResponse.json({ vault });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
