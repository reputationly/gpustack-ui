import { StatusMaps } from '@/config';

// Backend VideoTaskStateEnum values (docs/lightx2v-backend-design.md §6.1).
export interface ListItem {
  id: number;
  task_id: string;
  model_id?: number | null;
  model_name?: string | null;
  user_id: number;
  task_type: string;
  state: string;
  state_message?: string | null;
  nfs_path?: string | null;
  created_at: string;
  updated_at?: string;
}

export const VideoTaskStateMap = {
  queued: 'queued',
  assigned: 'assigned',
  running: 'running',
  done: 'done',
  failed: 'failed',
  canceled: 'canceled'
};

// state value -> StatusTag color bucket.
export const videoTaskStatus: Record<string, any> = {
  [VideoTaskStateMap.queued]: StatusMaps.transitioning,
  [VideoTaskStateMap.assigned]: StatusMaps.transitioning,
  [VideoTaskStateMap.running]: StatusMaps.transitioning,
  [VideoTaskStateMap.done]: StatusMaps.success,
  [VideoTaskStateMap.failed]: StatusMaps.error,
  [VideoTaskStateMap.canceled]: StatusMaps.inactive
};
