import { request } from '@umijs/max';
import type { ListItem } from '../config';

// Management list endpoint (owner/admin-scoped), served under the v2 base URL.
export const VIDEO_TASKS_API = '/video-tasks';

// OpenAI-compatible facade (bypasses the v2 base URL — starts with /v1).
const VIDEO_CONTENT_API = (taskId: string) => `/v1/videos/${taskId}/content`;

export async function queryVideoTasks<T extends Record<string, any>>(
  params: Global.SearchParams & T,
  options?: { token?: any; skipErrorHandler?: boolean }
) {
  return request<Global.PageResponse<ListItem>>(`${VIDEO_TASKS_API}`, {
    method: 'GET',
    params,
    cancelToken: options?.token,
    skipErrorHandler: options?.skipErrorHandler
  });
}

// Fetch the result file and trigger a browser download. Only meaningful for
// tasks in the `done` state.
export async function downloadVideoResult(taskId: string, filename?: string) {
  const blob = await request<Blob>(VIDEO_CONTENT_API(taskId), {
    method: 'GET',
    responseType: 'blob'
  });
  if (!(blob instanceof Blob)) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || taskId;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
