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
    '当输出盘用量超过高水位(0-1)时,Janitor 会从最旧的结果开始驱逐,直到降到低水位。',
  'storageSettings.loadFailed.tips':
    '当前配置读取失败,已禁用保存 —— 此时提交会把线上的按模型表覆盖成空表。请刷新页面后重试。',
  'storageSettings.admission.section': '队列 / 反压(准入控制)',
  'storageSettings.admission.enabled': '启用准入控制',
  'storageSettings.admission.enabled.tips':
    '开启后,当目标模型的预估排队等待超过下方容忍阈值时,门面直接以 429 拒绝提交,使繁忙集群快速失败而非持续堆积。',
  'storageSettings.admission.imageWait': '图片最大排队等待(秒)',
  'storageSettings.admission.imageWait.tips':
    '同步图片链路拒绝前可容忍的排队等待(与 new-api 的 QUEUED 超时对齐,约 25 秒)。',
  'storageSettings.admission.videoWait': '视频最大排队等待(秒)',
  'storageSettings.admission.videoWait.tips':
    '异步视频链路可容忍的排队等待(基于轮询,容忍更久,约 150 秒)。',
  'storageSettings.admission.audioWait': '语音最大排队等待(秒)',
  'storageSettings.admission.audioWait.tips':
    '异步语音合成链路可容忍的排队等待(短句 RTF~3、单实例 FIFO 8,约 60 秒)。',
  'storageSettings.admission.musicWait': '音乐最大排队等待(秒)',
  'storageSettings.admission.musicWait.tips':
    '异步文生音乐链路可容忍的排队等待(ACE-Step 热态约 10-30 秒一条、单实例 FIFO,约 90 秒)。',
  'storageSettings.admission.audiogenWait': '音频生成最大排队等待(秒)',
  'storageSettings.admission.audiogenWait.tips':
    '扩散类音频(AudioX 音效 / SoulX 歌声合成)可容忍的排队等待,约 90 秒。',
  'storageSettings.admission.latencyTable': '按模型延迟(秒)',
  'storageSettings.admission.latencyTable.tips':
    '各模型单实例热态生成秒数(按模型名子串匹配、不区分大小写,取第一个命中的行 —— 更长的模型名必须排在更短的上面,例如 qwen-image-edit 要在 qwen-image 之上)。用于预估 = floor(排队数 / 在线实例数) × 延迟。未匹配的模型按类别默认兜底。',
  'storageSettings.admission.queueWaitTable': '按模型最大排队等待(秒)',
  'storageSettings.admission.queueWaitTable.tips':
    '对单个模型覆盖上面的按类别阈值(匹配规则与行序优先级同上)。适用于同一类别里快慢悬殊的场景 —— 例如图片类同时有 z-image(约 8 秒)和 HunyuanImage-3(约 110 秒),一个共享阈值伺候不了两边。留空则沿用按类别的值。',
  'storageSettings.admission.modelName': '模型名(子串)',
  'storageSettings.admission.seconds': '秒',
  'storageSettings.admission.addModel': '+ 添加模型',
  'storageSettings.admission.moveUp': '上移(提高匹配优先级)',
  'storageSettings.admission.moveDown': '下移(降低匹配优先级)'
};
