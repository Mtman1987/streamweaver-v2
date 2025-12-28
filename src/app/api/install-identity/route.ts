import { NextResponse } from 'next/server';

import { getOrCreateInstallIdentity } from '@/lib/install-identity';

export async function GET() {
  const identity = await getOrCreateInstallIdentity();
  return NextResponse.json(identity);
}
