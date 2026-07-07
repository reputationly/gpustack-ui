export default {
  'videoTasks.table.taskId': 'Task ID',
  'videoTasks.table.model': 'Model',
  'videoTasks.table.type': 'Type',
  'videoTasks.table.user': 'User ID',
  'videoTasks.button.download': 'Download',
  'videoTasks.search.placeholder': 'Search by model',
  'storageSettings.outputRoot': 'Output Root Path',
  'storageSettings.outputRoot.tips':
    'Shared RW NFS directory where generated results are written. Leave empty to use the GPUSTACK_LX2V_OUTPUT_ROOT env var or /nfs-output.',
  'storageSettings.retentionDays': 'Retention (days)',
  'storageSettings.retentionDays.tips':
    'How long results are kept before the janitor deletes the expired day directories.',
  'storageSettings.highWatermark': 'High Watermark',
  'storageSettings.lowWatermark': 'Low Watermark',
  'storageSettings.watermark.tips':
    'When output filesystem usage exceeds the high watermark (0-1), the janitor evicts oldest results down to the low watermark.',
  'storageSettings.admission.section':
    'Queue / Backpressure (Admission Control)',
  'storageSettings.admission.enabled': 'Enable Admission Control',
  'storageSettings.admission.enabled.tips':
    'When on, the facade rejects a submit with 429 once the estimated queue wait for the target model exceeds the tolerance below, so a saturated cluster fails fast instead of piling up.',
  'storageSettings.admission.imageWait': 'Image Max Queue Wait (s)',
  'storageSettings.admission.imageWait.tips':
    'Tolerated queue wait for the synchronous image link before rejecting (aligned with new-api’s QUEUED timeout, ~25s).',
  'storageSettings.admission.videoWait': 'Video Max Queue Wait (s)',
  'storageSettings.admission.videoWait.tips':
    'Tolerated queue wait for the asynchronous video link (poll-based, tolerates longer, ~150s).',
  'storageSettings.admission.latencyTable': 'Per-model Latency (s)',
  'storageSettings.admission.latencyTable.tips':
    'Single-instance hot-state generation seconds per model (substring match, case-insensitive). Drives the estimate = floor(queued / running instances) × latency. Unknown models fall back to a per-kind default.',
  'storageSettings.admission.modelName': 'Model name (substring)',
  'storageSettings.admission.seconds': 'Seconds',
  'storageSettings.admission.addModel': '+ Add model'
};
