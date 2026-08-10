// Video task_type inference + per-type input requirements for the playground.
// Mirrors the launcher (_infer_model_cls / _infer_task_hint) and new-api
// (inferTaskType) heuristics so the UI can show the right upload controls
// without depending on model meta carrying an explicit task_type.

export type VideoTaskType =
  | 't2v'
  | 'i2v'
  // MiniMax H3 "last frame only" (L2VA). SAME input shape as i2v — exactly one
  // image — and only the SEMANTICS differ (that image is the last frame, and
  // the model works backwards from it). It therefore cannot be inferred from
  // the request shape and must be an explicit task_type; the facade turns it
  // into fl2va + extra_params.frame_indices=[-1].
  | 'l2va'
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
  | 'ads2v'
  // Mixed-reference video (MiniMax H3 Ref2VA): reference images + videos +
  // audio -> a video with speech. Distinct from s2v (InfiniteTalk drives lip
  // sync from a ready-made audio track) and from r2v (Bernini, images only,
  // no audio): here the audio is a TIMBRE reference and the spoken lines come
  // from the prompt.
  | 'r2va';

export interface VideoInputField {
  field: string; // facade input field (image/audio/video/src_video/src_mask/src_ref_images/last_frame)
  labelId: string; // i18n key
  accept: string;
  kind: 'image' | 'audio' | 'video';
  multiple?: boolean; // only src_ref_images
  required?: boolean;
  // Per-field file cap, when the task's cap differs from the kind default
  // (5 images / 2 videos). Set for r2va only, whose caps are engine-derived
  // (9/3/3) — a global bump would loosen vace/rv2v/r2v and mv2v/ads2v too.
  maxCount?: number;
}

const KNOWN_TASK_TYPES: VideoTaskType[] = [
  't2v',
  'i2v',
  'l2va',
  'flf2v',
  's2v',
  'sr',
  'vace',
  'v2a',
  'v2v',
  'rv2v',
  'r2v',
  'mv2v',
  'ads2v',
  'r2va'
];

// Is a raw meta.task_type value one this UI understands?
//
// meta is an unvalidated free-form JSON blob on the model (schemas/models.py:
// `meta: Optional[Dict[str, Any]]`), and this very key already carries an
// UNRELATED vocabulary elsewhere — meta_registry writes "CustomVoice" /
// "VoiceDesign" / "Base" into it for Qwen3-TTS deploys. So an unrecognized
// value is a normal case, not a corrupt one, and must be treated as "not set".
//
// Every consumer has to agree on that, or the two halves disagree: inference
// falls back to the model name while the caller still believes the operator
// pinned a type. Note the engine's own vocabulary (t2va/fl2va/ref2va) is NOT
// accepted here on purpose — those are engine partition/task names that the
// facade translates INTO from these values (_H3_TASK_MAP); feeding one back
// would be rejected by _VALID_TASK_TYPES, and fl2va is ambiguous anyway
// (i2v / l2va / flf2v all map onto it).
export const isKnownVideoTaskType = (value: any): value is VideoTaskType =>
  KNOWN_TASK_TYPES.includes(
    (value || '').toString().toLowerCase() as VideoTaskType
  );

// Prefer an explicit meta.task_type when the deploy set one; otherwise infer
// from the model name (same token order as the backend so the two never
// disagree on a given model).
export const inferVideoTaskType = (
  modelName: string,
  meta?: Record<string, any>
): VideoTaskType => {
  const explicit = (meta?.task_type || '').toString().toLowerCase();
  if (isKnownVideoTaskType(explicit)) {
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
  // MiniMax H3 partitions. Match the checkpoint-partition token, NOT a bare
  // 'h3' (far too broad). Kept in the same token order as new-api's
  // inferTaskType so the two never disagree on a given model.
  //   fl2va serves t2va + fl2va -> only a fallback default is possible (t2v);
  //         image-bearing calls must send an explicit task_type, because i2v
  //         and l2va are indistinguishable by input shape.
  //   ref2va serves ref2va only -> r2va.
  if (m.includes('ref2va')) return 'r2va';
  if (m.includes('fl2va')) return 't2v';
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

// MiniMax H3's fl2va PARTITION serves four playstyles from ONE weight set — the
// engine tells them apart by extra_params.frame_indices, which the facade fills
// in from task_type (_H3_TASK_MAP: i2v->[0], l2va->[-1], flf2v->[0,-1], t2v is
// the separate t2va task). i2v and l2va take the SAME input (exactly one image)
// and the deploy name carries no hint either, so nothing but an explicit choice
// can distinguish them — without this selector inferVideoTaskType's t2v fallback
// is the only reachable playstyle of the four.
// t2v FIRST, same reason as BERNINI_TASK_TYPES: zero-input, always submittable.
export const H3_FL2VA_TASK_TYPES: VideoTaskType[] = [
  't2v',
  'i2v',
  'l2va',
  'flf2v'
];

// Matches the checkpoint-partition token, exactly as inferVideoTaskType does —
// NOT a bare 'h3'. A deploy named without the token gets neither inference nor
// this selector; meta.task_type is the escape hatch (same limit as Bernini).
export const isH3Fl2vaModel = (modelName: string) =>
  (modelName || '').toLowerCase().includes('fl2va');

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp';
const AUDIO_ACCEPT = 'audio/*,.wav,.mp3,.m4a';
const VIDEO_ACCEPT = 'video/*,.mp4';

// MiniMax H3 Ref2VA reference caps, taken from the engine's own contract
// (pipeline_minimax_h3._validate_ref2va_reference_counts). The facade
// (_TASK_INPUT_CAPS["r2va"] / _H3_REF2VA_MAX_TOTAL_REFS) and new-api
// (maxR2VARef*) carry the same four numbers — raising any of them means
// raising it in all three places, or requests get rejected one layer down.
//
// The total is NOT the sum of the per-field caps (9+3+3 = 15 > 12), so a
// submit can satisfy every field cap and still be over. Both checks are needed.
export const R2VA_MAX_REF_IMAGES = 9;
export const R2VA_MAX_REF_VIDEOS = 3;
export const R2VA_MAX_REF_AUDIOS = 3;
export const R2VA_MAX_TOTAL_REFS = 12;

// Video-kind inputs are uploaded ONE FILE PER REQUEST: the facade's
// _UPLOAD_MAX_BODY is sized to a single max file and is checked against
// Content-Length before the body is read, so batching several videos into one
// multipart body is refused outright. src_video (mv2v/ads2v) and video (r2va
// reference videos) are the two multi-valued video fields.
export const VIDEO_UPLOAD_FIELDS = new Set(['src_video', 'video']);

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
  // Same single-image shape as i2v; only the label differs, because the image
  // is the LAST frame here. Reusing i2v's "first frame" label would tell the
  // user the opposite of what the model will do.
  l2va: [
    {
      field: 'image',
      labelId: 'playground.video.input.lastFrameOnly',
      accept: IMAGE_ACCEPT,
      kind: 'image',
      required: true
    }
  ],
  // MiniMax H3 Ref2VA: <=9 images + <=3 videos + <=3 audio, <=12 total.
  // No single field is required — the constraint is "at least one image OR
  // video", a cross-field rule that lives in missingInputMessage (page.tsx)
  // along with the R2VA_MAX_TOTAL_REFS check.
  r2va: [
    {
      field: 'image',
      labelId: 'playground.video.input.referenceImages',
      accept: IMAGE_ACCEPT,
      kind: 'image',
      multiple: true,
      required: false,
      maxCount: R2VA_MAX_REF_IMAGES
    },
    {
      field: 'video',
      labelId: 'playground.video.input.referenceVideos',
      accept: VIDEO_ACCEPT,
      kind: 'video',
      multiple: true,
      required: false,
      maxCount: R2VA_MAX_REF_VIDEOS
    },
    {
      field: 'audio',
      labelId: 'playground.video.input.referenceAudios',
      accept: AUDIO_ACCEPT,
      kind: 'audio',
      multiple: true,
      required: false,
      maxCount: R2VA_MAX_REF_AUDIOS
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

// An i18n message to show, NOT a formatted string: the validator stays free of
// react-intl so it can be exercised without rendering the page. The component
// resolves it.
export interface VideoInputError {
  id: string;
  // Interpolation values that are already literal (counts, task type names).
  values?: Record<string, string | number>;
  // Interpolation values that are themselves i18n keys and must be resolved
  // before being substituted — the required-field message names a field LABEL,
  // which is itself translated.
  labelIdValues?: Record<string, string>;
}

const count = (files: Record<string, File[]>, field: string) =>
  (files[field] || []).length;

// Client-side input guard, mirroring the constraints the facade and engine
// enforce authoritatively. Catching them here means a bad combination fails
// before any upload is streamed to NFS and before a queue slot is taken.
//
// Returns the FIRST violated rule, so the order below is the precedence order —
// keep the most basic rule (a required field is simply missing) first, and the
// refinements after it.
export const validateVideoInputs = (
  taskType: VideoTaskType,
  files: Record<string, File[]>
): VideoInputError | null => {
  for (const f of (videoTaskInputs[taskType] || []).filter((x) => x.required)) {
    if (!count(files, f.field)) {
      return {
        id: 'playground.video.input.required',
        labelIdValues: { field: f.labelId }
      };
    }
  }
  if (
    taskType === 'vace' &&
    !count(files, 'src_video') &&
    !count(files, 'src_ref_images')
  ) {
    return { id: 'playground.video.input.vaceRequired' };
  }
  // mv2v/ads2v need exactly TWO source videos (facade rejects otherwise).
  if (
    (taskType === 'mv2v' || taskType === 'ads2v') &&
    count(files, 'src_video') !== 2
  ) {
    return {
      id: 'playground.video.input.needTwoVideos',
      values: { type: taskType }
    };
  }
  // r2va needs at least one image OR video reference (engine:
  // _validate_ref2va_reference_counts). Audio alone is only a TIMBRE
  // reference — it cannot define who or what is on screen. Unlike the other
  // cross-field rules here the FACADE does not check this one, so without this
  // guard an audio-only submit uploads to NFS and takes a queue slot before the
  // engine rejects it.
  if (taskType === 'r2va' && !count(files, 'image') && !count(files, 'video')) {
    return { id: 'playground.video.input.r2vaRequired' };
  }
  // Engine/facade cross-modal total (12). The per-field caps sum to 15, so a
  // submit can be within every field cap and still be over the total.
  if (taskType === 'r2va') {
    const total =
      count(files, 'image') + count(files, 'video') + count(files, 'audio');
    if (total > R2VA_MAX_TOTAL_REFS) {
      return {
        id: 'playground.video.input.r2vaTooManyRefs',
        values: { max: R2VA_MAX_TOTAL_REFS, total }
      };
    }
  }
  // Mirror the facade's "src_mask requires src_video" cross-field constraint so
  // a mask-without-source-video upload isn't started only to be rejected.
  if (
    taskType === 'vace' &&
    count(files, 'src_mask') &&
    !count(files, 'src_video')
  ) {
    return { id: 'playground.video.input.maskNeedsVideo' };
  }
  return null;
};
