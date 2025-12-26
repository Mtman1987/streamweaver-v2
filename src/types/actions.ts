import type { Action as AutomationAction, SubAction, Trigger } from '@/services/automation/types';
import { SubActionType, TriggerType } from '@/services/automation/types';

// NOTE: The app UI and runtime automation are now aligned on the Streamer.bot-like
// automation types from src/services/automation/types.ts.

export type ActionDTO = AutomationAction & {
  // These fields exist in sb exports and are useful for UI, but not required by runtime.
  createdAt?: string;
  updatedAt?: string;
};

export type CreateActionDTO = {
  name: string;
  group?: string;
  enabled?: boolean;
};

export type UpdateActionDTO = Partial<ActionDTO>;

export type TriggerConfig = Trigger;
export type SubActionDefinition = SubAction;

export { TriggerType, SubActionType };
export type TriggerType = 
  | 'Chat Command' | 'Channel Point Reward' | 'Follow' | 'Subscribe' | 'Raid' | 'Host'
  | 'File Watcher' | 'Timer' | 'Hotkey' | 'OBS Scene Change' | 'Donation' | 'Cheer'
  | 'Stream Start' | 'Stream End' | 'User Join' | 'User Leave' | 'Message Delete'
  | 'Timeout' | 'Ban' | 'Unban' | 'Mod' | 'Unmod' | 'VIP' | 'Unvip' | 'Whisper';

export type SubActionType = 
  | 'Send Chat Message' | 'Execute Code' | 'Change OBS Scene' | 'Play Sound'
  | 'Show Overlay' | 'Hide Overlay' | 'Set Variable' | 'HTTP Request' | 'File Write'
  | 'File Read' | 'Discord Message' | 'TTS' | 'Delay' | 'Random' | 'Counter'
  | 'Twitch API' | 'Run Action' | 'Stop Action' | 'Enable Action' | 'Disable Action';

export interface TriggerConfig {
  type: TriggerType;
  config: Record<string, any>;
}

export interface SubAction {
  id: string;
  type: SubActionType;
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  order: number;
}

export interface ActionDTO {
  id: string;
  name: string;
  description?: string;
  triggers: TriggerConfig[];
  subActions: SubAction[];
  enabled: boolean;
  concurrent: boolean;
  queue: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateActionDTO = {
  name: string;
  description?: string;
  triggers?: TriggerConfig[];
  subActions?: SubAction[];
  enabled?: boolean;
  concurrent?: boolean;
  queue?: boolean;
};

export type UpdateActionDTO = Partial<CreateActionDTO>;