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
    'When output filesystem usage exceeds the high watermark (0-1), the janitor evicts oldest results down to the low watermark.'
};
