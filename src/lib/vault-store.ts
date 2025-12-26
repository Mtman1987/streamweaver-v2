import * as fs from 'fs/promises';
import { resolve } from 'path';

export type VaultData = {
  obs?: {
    ip?: string;
    port?: number;
    password?: string;
  };
  websocket?: {
    host?: string;
    port?: number;
  };
  points?: Record<string, number>;
};

const VAULT_FILE_PATH = resolve(process.cwd(), 'tokens', 'vault.json');

async function ensureVaultDirExists(): Promise<void> {
  const dir = resolve(process.cwd(), 'tokens');
  await fs.mkdir(dir, { recursive: true });
}

export async function readVault(): Promise<VaultData> {
  try {
    const raw = await fs.readFile(VAULT_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as VaultData;
    }
    return {};
  } catch (error: any) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}

export async function writeVault(next: VaultData): Promise<void> {
  await ensureVaultDirExists();
  await fs.writeFile(VAULT_FILE_PATH, JSON.stringify(next, null, 2), 'utf-8');
}

export async function updateVault(patch: Partial<VaultData>): Promise<VaultData> {
  const current = await readVault();
  const merged: VaultData = {
    ...current,
    ...patch,
    obs: { ...(current.obs || {}), ...(patch.obs || {}) },
    websocket: { ...(current.websocket || {}), ...(patch.websocket || {}) },
    points: { ...(current.points || {}), ...(patch.points || {}) },
  };
  await writeVault(merged);
  return merged;
}

export function getEffectiveObsUrlFromEnvOrVault(vault: VaultData): { url?: string; password?: string } {
  const envUrl = process.env.OBS_WS_URL;
  const envPassword = process.env.OBS_WS_PASSWORD;
  if (envUrl) {
    return { url: envUrl, password: envPassword };
  }

  const ip = vault.obs?.ip;
  const port = vault.obs?.port;
  if (!ip || !port) return {};
  const url = `ws://${ip}:${port}`;
  return { url, password: vault.obs?.password };
}
