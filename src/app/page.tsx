import { redirect } from 'next/navigation';
import { isUserConfigComplete } from '@/lib/user-config';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const isComplete = await isUserConfigComplete();
  redirect(isComplete ? '/bot-functions' : '/setup');
}
