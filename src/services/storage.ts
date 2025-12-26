import { promises as fs } from 'fs';
import path from 'path';

const DATA_ROOT = path.resolve(process.cwd(), 'data');
const ALLOW_FILE_IO = process.env.ALLOW_DATA_FILE_IO === 'true';

async function ensureDataDir() {
  await fs.mkdir(DATA_ROOT, { recursive: true });
}

async function checkPermission() {
  if (!ALLOW_FILE_IO) {
    throw new Error(
      'Data file access is disabled. Set ALLOW_DATA_FILE_IO=true in your environment to opt in.'
    );
  }
}

export async function readJsonFile<T = any>(fileName: string, defaultValue: T): Promise<T> {
  await checkPermission();
  await ensureDataDir();
  const filePath = path.join(DATA_ROOT, fileName);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

export async function writeJsonFile(fileName: string, data: any): Promise<void> {
  await checkPermission();
  await ensureDataDir();
  const filePath = path.join(DATA_ROOT, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
