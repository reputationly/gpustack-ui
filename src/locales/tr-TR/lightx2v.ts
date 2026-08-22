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
  'storageSettings.loadFailed.tips':
    'Could not load the current configuration, so saving is disabled (submitting now would wipe the live per-model tables). Reload and retry.',
  'storageSettings.admission.section':
    'Queue / Backpressure (Admission Control)',
  'storageSettings.admission.enabled': 'Enable Admission Control',
  'storageSettings.admission.enabled.tips':
    'When on, the facade rejects a submit with 429 once the estimated queue wait for the target model exceeds the tolerance below.',
  'storageSettings.admission.imageWait': 'Image Max Queue Wait (s)',
  'storageSettings.admission.imageWait.tips':
    'Tolerated queue wait for the synchronous image link before rejecting (~25s).',
  'storageSettings.admission.videoWait': 'Video Max Queue Wait (s)',
  'storageSettings.admission.videoWait.tips':
    'Tolerated queue wait for the asynchronous video link (~150s).',
  'storageSettings.admission.audioWait': 'Audio Max Queue Wait (s)',
  'storageSettings.admission.audioWait.tips':
    'Tolerated queue wait for the asynchronous audio (TTS) link (~60s).',
  'storageSettings.admission.musicWait': 'Music Max Queue Wait (s)',
  'storageSettings.admission.musicWait.tips':
    'Tolerated queue wait for the asynchronous music link (~90s).',
  'storageSettings.admission.audiogenWait':
    'Audio Generation Max Queue Wait (s)',
  'storageSettings.admission.audiogenWait.tips':
    'Tolerated queue wait for diffusion audio (AudioX / SoulX, ~90s).',
  'storageSettings.admission.latencyTable': 'Per-model Latency (s)',
  'storageSettings.admission.latencyTable.tips':
    'Single-instance hot-state generation seconds per model (substring match, FIRST matching row wins — put longer names above shorter ones). Estimate = floor(queued / running instances) × latency.',
  'storageSettings.admission.queueWaitTable': 'Per-model Max Queue Wait (s)',
  'storageSettings.admission.queueWaitTable.tips':
    'Overrides the per-kind ceilings above for one model (same matching and row-order precedence). Leave empty to use the per-kind value.',
  'storageSettings.admission.modelName': 'Model name (substring)',
  'storageSettings.admission.seconds': 'Seconds',
  'storageSettings.admission.addModel': '+ Add model',
  'storageSettings.admission.moveUp': 'Move up (higher match priority)',
  'storageSettings.admission.moveDown': 'Move down (lower match priority)'
};
