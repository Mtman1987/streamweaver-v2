import * as fs from 'fs';
import { randomUUID } from 'crypto';
import type { Action, SubAction, Trigger } from '@/services/automation/types';
import { readSbActionsFile, writeSbActionsFile } from '@/lib/sb-store';
import { SB_ACTIONS_FILE_PATH } from '@/lib/sb-store';

// sb/actions.json is the source of truth for runtime automation.

function normalizeAction(raw: any): Action {
  const now = new Date().toISOString();
  return {
    id: (raw?.id ?? randomUUID()).toString(),
    name: (raw?.name ?? 'Untitled Action').toString(),
    enabled: raw?.enabled ?? false,
    group: typeof raw?.group === 'string' ? raw.group : undefined,
    alwaysRun: raw?.alwaysRun ?? false,
    randomAction: raw?.randomAction ?? false,
    concurrent: raw?.concurrent ?? false,
    excludeFromHistory: raw?.excludeFromHistory ?? false,
    excludeFromPending: raw?.excludeFromPending ?? false,
    queue: typeof raw?.queue === 'string' ? raw.queue : undefined,
    triggers: Array.isArray(raw?.triggers) ? (raw.triggers as Trigger[]) : [],
    subActions: Array.isArray(raw?.subActions) ? (raw.subActions as SubAction[]) : [],
    // Preserve any extra Streamer.bot fields by leaving them on raw file object; this DTO is minimal.
    ...(raw?.createdAt ? { createdAt: raw.createdAt } : { createdAt: now }),
    ...(raw?.updatedAt ? { updatedAt: raw.updatedAt } : { updatedAt: now }),
  } as any;
}

export async function getAllActions(): Promise<Action[]> {
  const file = await readSbActionsFile();
  const actions = Array.isArray(file.actions) ? file.actions : [];
  return actions.map(normalizeAction);
}

export async function getActionById(id: string): Promise<Action | undefined> {
  const actions = await getAllActions();
  return actions.find((a) => a.id === id);
}

export type CreateActionInput = {
  name: string;
  group?: string;
  enabled?: boolean;
};

export async function createAction(input: CreateActionInput): Promise<Action> {
  const file = await readSbActionsFile();
  const actions = Array.isArray(file.actions) ? (file.actions as any[]) : [];
  const now = new Date().toISOString();
  const id = randomUUID();
  const created: any = {
    id,
    name: input.name.trim() || 'Untitled Action',
    enabled: input.enabled ?? false,
    group: input.group?.trim() || undefined,
    alwaysRun: false,
    randomAction: false,
    concurrent: false,
    excludeFromHistory: false,
    excludeFromPending: false,
    triggers: [],
    subActions: [],
    createdAt: now,
    updatedAt: now,
  };
  actions.push(created);
  await writeSbActionsFile({ ...file, actions });
  return normalizeAction(created);
}

export async function updateAction(id: string, updates: Partial<Action>): Promise<Action | null> {
  const file = await readSbActionsFile();
  const actions = Array.isArray(file.actions) ? (file.actions as any[]) : [];
  const index = actions.findIndex((a) => String(a?.id) === id);
  if (index === -1) return null;
  const current = actions[index];
  const next = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  actions[index] = next;
  await writeSbActionsFile({ ...file, actions });
  return normalizeAction(next);
}

export async function deleteAction(id: string): Promise<boolean> {
  const file = await readSbActionsFile();
  const actions = Array.isArray(file.actions) ? (file.actions as any[]) : [];
  const next = actions.filter((a) => String(a?.id) !== id);
  if (next.length === actions.length) return false;
  await writeSbActionsFile({ ...file, actions: next });
  return true;
}

export function watchActionsFile(onChange: () => void): () => void {
  const throttleMs = 300;
  let timeout: NodeJS.Timeout | null = null;

  const watcher = fs.watch(SB_ACTIONS_FILE_PATH, () => {
    if (timeout) return;
    timeout = setTimeout(() => {
      timeout = null;
      onChange();
    }, throttleMs);
  });
  return () => watcher.close();
}
