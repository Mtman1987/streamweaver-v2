import crypto from 'crypto';

import { readUserConfig, writeUserConfig, type UserConfig } from '@/lib/user-config';

export type InstallIdentity = {
  installId: string;
  installSecret: string;
};

const INSTALL_ID_KEY = 'STREAMWEAVER_INSTALL_ID';
const INSTALL_SECRET_KEY = 'STREAMWEAVER_INSTALL_SECRET';

function randomId(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export async function getOrCreateInstallIdentity(): Promise<InstallIdentity> {
  const cfg = await readUserConfig();

  const existingId = cfg[INSTALL_ID_KEY as keyof UserConfig];
  const existingSecret = cfg[INSTALL_SECRET_KEY as keyof UserConfig];

  if (existingId && existingSecret) {
    return { installId: existingId, installSecret: existingSecret };
  }

  const installId = existingId || `sw_${randomId(16)}`;
  const installSecret = existingSecret || randomId(32);

  await writeUserConfig({
    [INSTALL_ID_KEY]: installId,
    [INSTALL_SECRET_KEY]: installSecret,
  });

  return { installId, installSecret };
}
