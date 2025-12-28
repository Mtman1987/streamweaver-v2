import crypto from 'crypto';

import type { VaultData } from '@/lib/vault-store';

export type EncryptedVaultFileV1 = {
  version: 1;
  kdf: {
    name: 'scrypt';
    saltB64: string;
    N: number;
    r: number;
    p: number;
    keyLen: number;
  };
  cipher: {
    name: 'aes-256-gcm';
    ivB64: string;
    tagB64: string;
    ciphertextB64: string;
  };
};

type ScryptParams = {
  N: number;
  r: number;
  p: number;
  keyLen: number;
};

const DEFAULT_SCRYPT: ScryptParams = {
  N: 2 ** 15,
  r: 8,
  p: 1,
  keyLen: 32,
};

function b64(buf: Buffer): string {
  return buf.toString('base64');
}

function fromB64(value: string): Buffer {
  return Buffer.from(value, 'base64');
}

function deriveKey(password: string, salt: Buffer, params: ScryptParams = DEFAULT_SCRYPT): Buffer {
  return crypto.scryptSync(password, salt, params.keyLen, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: 128 * 1024 * 1024,
  });
}

export function encryptVaultDataV1(vault: VaultData, password: string): EncryptedVaultFileV1 {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(password, salt);

  const plaintext = Buffer.from(JSON.stringify(vault), 'utf8');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    kdf: {
      name: 'scrypt',
      saltB64: b64(salt),
      N: DEFAULT_SCRYPT.N,
      r: DEFAULT_SCRYPT.r,
      p: DEFAULT_SCRYPT.p,
      keyLen: DEFAULT_SCRYPT.keyLen,
    },
    cipher: {
      name: 'aes-256-gcm',
      ivB64: b64(iv),
      tagB64: b64(tag),
      ciphertextB64: b64(ciphertext),
    },
  };
}

export function decryptVaultFileV1(file: EncryptedVaultFileV1, password: string): VaultData {
  if (file.version !== 1) {
    throw new Error('Unsupported vault file version');
  }
  if (file.kdf?.name !== 'scrypt' || file.cipher?.name !== 'aes-256-gcm') {
    throw new Error('Unsupported vault file format');
  }

  const salt = fromB64(file.kdf.saltB64);
  const iv = fromB64(file.cipher.ivB64);
  const tag = fromB64(file.cipher.tagB64);
  const ciphertext = fromB64(file.cipher.ciphertextB64);

  const key = deriveKey(password, salt, {
    N: file.kdf.N,
    r: file.kdf.r,
    p: file.kdf.p,
    keyLen: file.kdf.keyLen,
  });

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const parsed = JSON.parse(plaintext.toString('utf8'));
  if (!parsed || typeof parsed !== 'object') return {};
  return parsed as VaultData;
}
