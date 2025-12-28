import * as fs from 'fs/promises';
import { resolve } from 'path';
import { decryptVaultFileV1, encryptVaultDataV1, type EncryptedVaultFileV1 } from '@/lib/vault-crypto';

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
const ENCRYPTED_VAULT_FILE_PATH = resolve(process.cwd(), 'tokens', 'vault.enc.json');

class VaultLockedError extends Error {
  constructor() {
    super('Vault is locked');
    this.name = 'VaultLockedError';
  }
}

let unlockedPassword: string | null = null;

async function ensureVaultDirExists(): Promise<void> {
  const dir = resolve(process.cwd(), 'tokens');
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

export async function isVaultEncrypted(): Promise<boolean> {
  return await fileExists(ENCRYPTED_VAULT_FILE_PATH);
}

export function isVaultUnlocked(): boolean {
  return Boolean(unlockedPassword);
}

export async function unlockVault(password: string): Promise<void> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password required');
  }
  const raw = await fs.readFile(ENCRYPTED_VAULT_FILE_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as EncryptedVaultFileV1;
  // Will throw if password is wrong or file is corrupted.
  decryptVaultFileV1(parsed, password);
  unlockedPassword = password;
}

export function lockVault(): void {
  unlockedPassword = null;
}

export async function setVaultPassword(password: string): Promise<void> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password required');
  }

  await ensureVaultDirExists();

  // Read legacy plaintext vault.json if present.
  let current: VaultData = {};
  if (await fileExists(VAULT_FILE_PATH)) {
    const raw = await fs.readFile(VAULT_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') current = parsed as VaultData;
  }

  const enc = encryptVaultDataV1(current, password);
  await fs.writeFile(ENCRYPTED_VAULT_FILE_PATH, JSON.stringify(enc, null, 2), 'utf-8');

  // Remove legacy plaintext file after successful encryption.
  // (If you want backups, export state via the app before enabling the password.)
  try {
    if (await fileExists(VAULT_FILE_PATH)) await fs.unlink(VAULT_FILE_PATH);
  } catch {
    // ignore
  }

  unlockedPassword = password;
}

async function readEncryptedVaultOrThrow(): Promise<VaultData> {
  if (!unlockedPassword) throw new VaultLockedError();
  const raw = await fs.readFile(ENCRYPTED_VAULT_FILE_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as EncryptedVaultFileV1;
  return decryptVaultFileV1(parsed, unlockedPassword);
}

async function writeEncryptedVaultOrThrow(next: VaultData): Promise<void> {
  if (!unlockedPassword) throw new VaultLockedError();
  const enc = encryptVaultDataV1(next, unlockedPassword);
  await ensureVaultDirExists();
  await fs.writeFile(ENCRYPTED_VAULT_FILE_PATH, JSON.stringify(enc, null, 2), 'utf-8');
}

export async function readVault(): Promise<VaultData> {
  try {
    if (await fileExists(ENCRYPTED_VAULT_FILE_PATH)) {
      return await readEncryptedVaultOrThrow();
    }

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
  if (await fileExists(ENCRYPTED_VAULT_FILE_PATH)) {
    await writeEncryptedVaultOrThrow(next);
    return;
  }

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
