import { NextRequest, NextResponse } from 'next/server';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { ACTIONS_FILE_PATH } from '@/lib/actions-store';
import { COMMANDS_FILE_PATH } from '@/lib/commands-store';

type FileKey = 'actions' | 'commands' | 'private-chat';

function resolveFilePath(file: FileKey): string {
  if (file === 'actions') return ACTIONS_FILE_PATH;
  if (file === 'commands') return COMMANDS_FILE_PATH;
  return path.resolve(process.cwd(), 'src', 'data', 'private-chat.json');
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const file = (url.searchParams.get('file') || '').toLowerCase() as FileKey;

    if (file !== 'actions' && file !== 'commands' && file !== 'private-chat') {
      return NextResponse.json(
        { error: 'Invalid file. Use ?file=actions, ?file=commands, or ?file=private-chat' },
        { status: 400 }
      );
    }

    const filePath = resolveFilePath(file);
    const [stat, raw] = await Promise.all([
      fsp.stat(filePath),
      fsp.readFile(filePath, 'utf-8'),
    ]);

    // Best-effort count (don’t fail the endpoint if JSON is temporarily invalid while editing)
    let count: number | null = null;
    try {
      const parsed = JSON.parse(raw);
      count = Array.isArray(parsed) ? parsed.length : null;
    } catch {
      count = null;
    }

    return NextResponse.json({
      file,
      path: filePath,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      count,
      raw,
    });
  } catch (error) {
    console.error('[debug/data-files] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read file' },
      { status: 500 }
    );
  }
}
