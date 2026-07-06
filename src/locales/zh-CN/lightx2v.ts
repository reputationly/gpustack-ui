export default {
  'videoTasks.table.taskId': '任务 ID',
  'videoTasks.table.model': '模型',
  'videoTasks.table.type': '类型',
  'videoTasks.table.user': '用户 ID',
  'videoTasks.button.download': '下载',
  'videoTasks.search.placeholder': '按模型搜索',
  'storageSettings.outputRoot': '输出根路径',
  'storageSettings.outputRoot.tips':
    '生成结果写入的共享可写 NFS 目录。留空则使用 GPUSTACK_LX2V_OUTPUT_ROOT 环境变量或 /nfs-output。',
  'storageSettings.retentionDays': '保留天数',
  'storageSettings.retentionDays.tips':
    '结果在被 Janitor 删除过期按天目录前的保留天数。',
  'storageSettings.highWatermark': '高水位',
  'storageSettings.lowWatermark': '低水位',
  'storageSettings.watermark.tips':
    '当输出盘用量超过高水位(0-1)时,Janitor 会从最旧的结果开始驱逐,直到降到低水位。'
};
