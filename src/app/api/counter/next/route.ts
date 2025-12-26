import { NextResponse } from 'next/server';
import { getNextMessageNumber } from '@/lib/message-counter';

export async function POST() {
  try {
    const number = await getNextMessageNumber();
    console.log(`[Counter API] Generated message number: ${number}`);
    return NextResponse.json({ number });
  } catch (error) {
    console.error('Error getting next message number:', error);
    return NextResponse.json({ error: 'Failed to get message number' }, { status: 500 });
  }
}