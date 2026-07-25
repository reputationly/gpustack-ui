// Video task_type inference + per-type input requirements for the playground.
// Mirrors the launcher (_infer_model_cls / _infer_task_hint) and new-api
// (inferTaskType) heuristics so the UI can show the right upload controls
// without depending on model meta carrying an explicit task_type.

export type VideoTaskType =
  | 't2v'
  | 'i2v'
  | 'flf2v'
  | 's2v'
  | 'sr'
  | 'vace'
  | 'v2a'
  // Bernini video playstyles (task_type drives the engine's system prompt +
  // guidance): v2v single-source edit, rv2v source+reference-images edit,
  // r2v reference-images -> video, mv2v/ads2v TWO source videos (multi-source
  // edit / ad insertion — same inputs, different engine recipe).
  | 'v2v'
  | 'rv2v'
  | 'r2v'
  | 'mv2v'
  | 'ads2v';

export interface VideoInputField {
  field: string; // facade input field (image/audio/video/src_video/src_mask/src_ref_images/last_frame)
  labelId: string; // i18n key
  accept: string;
  kind: 'image' | 'audio' | 'video';
  multiple?: boolean; // only src_ref_images
  required?: boolean;
}

const KNOWN_TASK_TYPES: VideoTaskType[] = [
  't2v',
  'i2v',
  'flf2v',
  's2v',
  'sr',
  'vace',
  'v2a',
  'v2v',
  'rv2v',
  'r2v',
  'mv2v',
  'ads2v'
];

// Prefer an explicit meta.task_type when the deploy set one; otherwise infer
// from the model name (same token order as the backend so the two never
// disagree on a given model).
export const inferVideoTaskType = (
  modelName: string,
  meta?: Record<string, any>
): VideoTaskType => {
  const explicit = (meta?.task_type || '').toString().toLowerCase();
  if (KNOWN_TASK_TYPES.includes(explicit as VideoTaskType)) {
    return explicit as VideoTaskType;
  }
  const m = (modelName || '').toLowerCase();
  if (m.includes('infinitetalk') || m.includes('s2v')) return 's2v';
  if (m.includes('seedvr') || m.includes('-sr') || m.endsWith('sr'))
    return 'sr';
  // Video dubbing (v2a): SAME pixels back + AI audio track (.mp4). Match the
  // task token only ('v2a'/'dub', e.g. deploy name "ltx2-v2a"), NOT the model
  // family: plain LTX generation checkpoints (LTX-Video t2v/i2v, ltx2 t2av)
  // must fall through to their own branches / the t2v default.
  if (m.includes('v2a') || m.includes('dub')) return 'v2a';
  if (m.includes('vace')) return 'vace';
  // Bernini serves t2v/v2v/rv2v/r2v/mv2v/ads2v from ONE model; the name only
  // gives a default — t2v (zero-input, always submittable, same as the old
  // fall-through). Pick edit/reference playstyles via an explicit
  // meta.task_type or the playground's task-type selector.
  if (m.includes('bernini')) return 't2v';
  if (m.includes('flf2v')) return 'flf2v';
  if (m.includes('i2v')) return 'i2v';
  return 't2v';
};

// Bernini playstyle set for the playground's explicit selector (one model, six
// task types incl. plain text-to-video; ads2v shares mv2v's inputs but a
// different engine recipe). t2v FIRST: it is the zero-input default, so a
// Bernini deploy without meta.task_type stays submittable with no uploads.
export const BERNINI_TASK_TYPES: VideoTaskType[] = [
  't2v',
  'v2v',
  'rv2v',
  'r2v',
  'mv2v',
  'ads2v'
];

export const isBerniniModel = (modelName: string) =>
  (modelName || '').toLowerCase().includes('bernini');

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp';
const AUDIO_ACCEPT = 'audio/*,.wav,.mp3,.m4a';
const VIDEO_ACCEPT = 'video/*,.mp4';

// What each task_type needs uploaded. Fields map 1:1 to the facade _INPUT_FIELDS
// keys; the playground uploads each via POST /v1/videos/inputs before submitting.
export const videoTaskInputs: Record<VideoTaskType, VideoInputField[]> = {
  t2v: [],
  i2v: [
    {
      field: 'image',
      labelId: 'playground.video.input.image',
      accept: IMAGE_ACCEPT,
      kind: 'image',
      required: true
    }
  ],
  flf2v: [
    {
      field: 'image',
      labelId: 'playground.video.input.firstFrame',
      accept: IMAGE_ACCEPT,
      kind: 'image',
      required: true
    },
    {
      field: 'last_frame',
      labelId: 'playground.video.input.lastFrame',
      accept: IMAGE_ACCEPT,
      kind: 'image',
      required: true
    }
  ],
  s2v: [
    {
      field: 'image',
      labelId: 'playground.video.input.portrait',
      accept: IMAGE_ACCEPT,
      kind: 'image',
      required: true
    },
    {
      field: 'audio',
      labelId: 'playground.video.input.audio',
      accept: AUDIO_ACCEPT,
      kind: 'audio',
      required: true
    }
  ],
  sr: [
    {
      field: 'video',
      labelId: 'playground.video.input.video',
      accept: VIDEO_ACCEPT,
      kind: 'video',
      required: true
    }
  ],
  v2a: [
    {
      field: 'video',
      labelId: 'playground.video.input.video',
      accept: VIDEO_ACCEPT,
      kind: 'video',
      required: true
    }
  ],
  v2v: [
    {
      field: 'src_video',
      labelId: 'playground.video.input.srcVideo',
      accept: VIDEO_ACCEPT,
      kind: 'video',
      required: true
    }
  ],
  rv2v: [
    {
      field: 'src_video',
      labelId: 'playground.video.input.srcVideo',
      accept: VIDEO_ACCEPT,
      kind: 'video',
      required: true
    },
    {
      field: 'src_ref_images',
      labelId: 'playground.video.input.srcRefImages',
      accept: IMAGE_ACCEPT,
      kind: 'image',
      multiple: true,
      required: true
    }
  ],
  r2v: [
    {
      field: 'src_ref_images',
      labelId: 'playground.video.input.srcRefImages',
      accept: IMAGE_ACCEPT,
      kind: 'image',
      multiple: true,
      required: true
    }
  ],
  // mv2v/ads2v: exactly TWO source videos (facade caps src_video at 2 for these
  // task types only). Each video is uploaded in its own request (body ceiling
  // is sized to one max file — see use-text-video upload loop).
  mv2v: [
    {
      field: 'src_video',
      labelId: 'playground.video.input.srcVideo',
      accept: VIDEO_ACCEPT,
      kind: 'video',
      multiple: true,
      required: true
    }
  ],
  ads2v: [
    {
      field: 'src_video',
      labelId: 'playground.video.input.srcVideo',
      accept: VIDEO_ACCEPT,
      kind: 'video',
      multiple: true,
      required: true
    }
  ],
  vace: [
    {
      field: 'src_video',
      labelId: 'playground.video.input.srcVideo',
      accept: VIDEO_ACCEPT,
      kind: 'video'
    },
    {
      field: 'src_mask',
      labelId: 'playground.video.input.srcMask',
      accept: VIDEO_ACCEPT,
      kind: 'video'
    },
    {
      field: 'src_ref_images',
      labelId: 'playground.video.input.srcRefImages',
      accept: IMAGE_ACCEPT,
      kind: 'image',
      multiple: true
    }
  ]
};

// sr exposes a request-level upscale factor (default 2.0; the engine clamps to
// the config target size). Other task types have no extra scalar inputs.
export const taskHasSrRatio = (taskType: VideoTaskType) => taskType === 'sr';
