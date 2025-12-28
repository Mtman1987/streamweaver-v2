import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const meshStatePath = path.join(process.cwd(), 'discordstream', 'mesh_state.json');
    
    if (!fs.existsSync(meshStatePath)) {
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        status: 'idle',
        rooms: {
          lobby: { name: 'Lobby' },
          gaming: { name: 'Gaming' },
          chill: { name: 'Chill Zone' }
        },
        users: {}
      });
    }

    const data = fs.readFileSync(meshStatePath, 'utf8');
    const meshState = JSON.parse(data);
    
    return NextResponse.json(meshState, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error reading mesh state:', error);
    return NextResponse.json({ error: 'Failed to read mesh state' }, { status: 500 });
  }
}