import { db } from './db'
import { writeFileSync } from 'fs'
import { seedDevices, type SeedDevice } from './seedDevices'

function escapeSvgText(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function seedDeviceFilename(index: number) {
  return `seed-device-${String(index + 1).padStart(2, '0')}.svg`
}

function writeSeedDeviceImage(device: SeedDevice, filename: string) {
  const label = escapeSvgText(device.name.slice(0, 4))
  writeFileSync(`uploads/stickers/${filename}`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#f7fafc"/><circle cx="64" cy="46" r="24" fill="${device.theme_color}"/><rect x="28" y="78" width="72" height="22" rx="11" fill="${device.theme_color}"/><text x="64" y="93" text-anchor="middle" font-size="14" font-family="sans-serif" fill="white">${label}</text></svg>`)
}

export function runSeed() {

// 清空所有数据（保留表结构）
db.query('DELETE FROM check_results').run()
db.query('DELETE FROM flowchart_history').run()
db.query('DELETE FROM flowcharts').run()
db.query('DELETE FROM journal_placements').run()
db.query('DELETE FROM messages').run()
db.query('DELETE FROM groups').run()
db.query("DELETE FROM sqlite_sequence WHERE name IN ('groups','messages','flowcharts','flowchart_history','check_results')").run()

for (let i = 0; i < seedDevices.length; i++) {
  const device = seedDevices[i]
  const filename = seedDeviceFilename(i)
  writeSeedDeviceImage(device, filename)
  const existing = db.query('SELECT id FROM stickers WHERE filename = ?').get(filename) as { id: number } | null
  if (existing) {
    db.query(
      'UPDATE stickers SET name = ?, description = ?, install_location = ?, theme_color = ? WHERE id = ?'
    ).run(device.name, device.description, device.install_location, device.theme_color, existing.id)
  } else {
    db.query(
      'INSERT INTO stickers (name, description, install_location, theme_color, filename) VALUES (?, ?, ?, ?, ?)'
    ).run(device.name, device.description, device.install_location, device.theme_color, filename)
  }
}

// ── 流程图模板 ────────────────────────────────────────────────
const charts: Record<string, string[]> = {
  '大门区域': [
    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[人体红外传感器]:::sensor -->|检测到人员| B[MQTT网关]:::gateway
  B --> C[云服务器]:::server
  C -->|开门指令| D[电动门控制器]:::actuator`,

    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[人体红外传感器]:::sensor -->|检测到人员靠近| B[MQTT网关]:::gateway
  B --> C[云服务器]:::server
  C -->|发送开门指令| D[电动门控制器]:::actuator
  D -->|门已开启| E[大厅联动界面]:::actuator
  A -->|未检测到人员| C
  C -->|延时关门| D`,
  ],

  '身份识别': [
    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[RFID读卡器]:::sensor -->|读取卡号| B[MQTT网关]:::gateway
  B --> C[云服务器]:::server
  C -->|验证通过| D[门禁闸机]:::actuator
  C -->|非法闯入| E[声光报警器]:::actuator`,

    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[RFID读卡器]:::sensor -->|读取卡片信息| B[MQTT网关]:::gateway
  B --> C[云服务器]:::server
  C -->|身份验证通过| D[门禁闸机]:::actuator
  C -->|实时统计| E[人流量数据库]:::server
  E -->|数据展示| F[LED大屏]:::actuator
  C -->|非法闯入| G[声光报警器]:::actuator`,
  ],

  '大厅安防': [
    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[温湿度传感器]:::sensor --> B[MQTT网关]:::gateway
  C[CO₂传感器]:::sensor --> B
  B --> D[云服务器]:::server
  D -->|超标| E[空调控制器]:::actuator
  D -->|超标| F[预警提示屏]:::actuator`,

    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[温湿度传感器]:::sensor --> B[MQTT网关]:::gateway
  C[CO₂传感器]:::sensor --> B
  D[烟雾传感器]:::sensor --> B
  E[火焰传感器]:::sensor --> B
  B --> F[云服务器]:::server
  F -->|温度过高| G[空调制冷]:::actuator
  F -->|湿度过高| H[除湿控制器]:::actuator
  F -->|烟雾/火焰| I[消防报警系统]:::actuator
  F -->|数据超标| J[预警展示屏]:::actuator`,
  ],

  'LED显示': [
    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[时间模块]:::sensor -->|日期时间| B[云服务器]:::server
  C[环境传感器]:::sensor -->|温湿度数据| B
  B -->|推送内容| D[LED大屏控制器]:::actuator
  D --> E[LED显示屏]:::actuator`,

    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[时间模块]:::sensor -->|日期时间| B[MQTT网关]:::gateway
  C[温湿度传感器]:::sensor -->|环境数据| B
  D[门禁系统]:::sensor -->|安防状态| B
  B --> E[云服务器]:::server
  E -->|推送显示内容| F[LED控制器]:::actuator
  F --> G[LED大屏]:::actuator
  E -->|新书/通知| F`,
  ],

  '绿色植物': [
    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[土壤湿度传感器]:::sensor -->|水分数据| B[MQTT网关]:::gateway
  B --> C[云服务器]:::server
  C -->|水分不足| D[浇水装置]:::actuator
  D -->|浇水完成| C`,

    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[土壤湿度传感器]:::sensor -->|实时监测水分| B[MQTT网关]:::gateway
  B --> C[云服务器]:::server
  C -->|水分不足阈值| D{判断}
  D -->|需要浇水| E[雾化加湿装置]:::actuator
  D -->|水分充足| F[保持待机]:::actuator
  E -->|浇水完成| C
  C -->|自动停止| E`,
  ],

  '自助系统': [
    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[RFID扫描仪]:::sensor -->|扫描图书| B[MQTT网关]:::gateway
  B --> C[图书馆服务器]:::server
  C -->|借还成功| D[打印机]:::actuator
  C -->|查询结果| E[触摸屏终端]:::actuator`,

    `graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[RFID扫描仪]:::sensor -->|扫描图书信息| B[MQTT网关]:::gateway
  C[触摸屏终端]:::sensor -->|用户操作| B
  B --> D[图书馆服务器]:::server
  D -->|借还处理| E[RFID读写器]:::actuator
  D -->|打印凭证| F[票据打印机]:::actuator
  D -->|查询结果| C
  D -->|电子阅览| G[阅览终端]:::actuator`,
  ],
}

type CR = { passed: boolean; comment: string }

// checkTemplates[area][historyIdx] = 该次生成流程图的多轮检测记录（数组）
const checkTemplates: Record<string, CR[][][]> = {
  '大门区域': [
    // 第1次生成的2轮检测（学生修改后再检）
    [
      [
        { passed: true,  comment: '红外传感器节点体现了人员进出检测' },
        { passed: true,  comment: '有人靠近时触发开门逻辑，已体现' },
        { passed: false, comment: '未见人员离开后自动关门的流程' },
        { passed: false, comment: '缺少大厅界面动画联动节点' },
      ],
      [
        { passed: true,  comment: '红外传感器检测体现完整' },
        { passed: true,  comment: '开门逻辑已清晰' },
        { passed: false, comment: '仍未见延时关门分支' },
        { passed: false, comment: '大厅联动还未加入' },
      ],
    ],
    // 第2次生成（改进版）的2轮检测
    [
      [
        { passed: true,  comment: '红外传感器检测人员进出，完整体现' },
        { passed: true,  comment: '开门指令路径清晰，已体现' },
        { passed: true,  comment: '延时关门模块已加入流程' },
        { passed: false, comment: '大厅联动界面标注不够明确' },
      ],
      [
        { passed: true,  comment: '红外传感器检测完整' },
        { passed: true,  comment: '开门指令完整' },
        { passed: true,  comment: '延时关门完整' },
        { passed: true,  comment: '大厅联动界面节点已清晰标注' },
      ],
    ],
  ],

  '身份识别': [
    [
      [
        { passed: true,  comment: 'RFID读卡器节点体现刷卡识别' },
        { passed: true,  comment: '验证通过后闸机开启，逻辑正确' },
        { passed: false, comment: '未见人流量统计相关节点' },
        { passed: true,  comment: '非法闯入触发声光报警，已体现' },
      ],
      [
        { passed: true,  comment: 'RFID识别完整' },
        { passed: true,  comment: '门禁闸机逻辑正确' },
        { passed: false, comment: '人流量统计节点仍缺失' },
        { passed: true,  comment: '声光报警已体现' },
      ],
    ],
    [
      [
        { passed: true,  comment: 'RFID读卡器完整体现身份识别' },
        { passed: true,  comment: '验证通过开启门禁闸机，已体现' },
        { passed: true,  comment: '人流量数据库节点已加入' },
        { passed: true,  comment: '声光报警器节点完整' },
      ],
    ],
  ],

  '大厅安防': [
    [
      [
        { passed: true,  comment: '温湿度传感器节点体现监测' },
        { passed: true,  comment: 'CO₂传感器已加入' },
        { passed: false, comment: '未见烟雾/火焰传感器节点' },
        { passed: true,  comment: '超标后预警提示已体现' },
        { passed: false, comment: '缺少空调自动调控的具体分支' },
      ],
      [
        { passed: true,  comment: '温湿度监测完整' },
        { passed: true,  comment: 'CO₂传感器正常' },
        { passed: false, comment: '烟雾/火焰传感器仍缺失' },
        { passed: true,  comment: '预警提示已体现' },
        { passed: false, comment: '空调调控分支仍不完整' },
      ],
    ],
    [
      [
        { passed: true,  comment: '温湿度传感器完整体现' },
        { passed: true,  comment: 'CO₂传感器已加入' },
        { passed: true,  comment: '烟雾/火焰传感器节点已添加' },
        { passed: true,  comment: '预警展示屏节点清晰' },
        { passed: false, comment: '空调制冷与除湿分支需更明确区分' },
      ],
      [
        { passed: true,  comment: '温湿度传感器完整' },
        { passed: true,  comment: 'CO₂传感器完整' },
        { passed: true,  comment: '烟雾/火焰传感器完整' },
        { passed: true,  comment: '预警展示屏完整' },
        { passed: true,  comment: '空调制冷/除湿分支逻辑完整' },
      ],
    ],
  ],
}

// ── 对话模板 ─────────────────────────────────────────────────
// conversationTemplates[area][i] 对应 charts[area][i] 那次生成的对话
const conversationTemplates: Record<string, { user: string; assistant: (code: string) => string }[]> = {
  '大门区域': [
    {
      user: '请为「大门」功能模块设计物联网施工方案。\n功能需求：\n1. 检测人员靠近时自动开门\n2. 开门指令通过云服务器下发',
      assistant: (code) => `好的，以下是「大门」模块初版施工方案。

**感知层**：人体红外传感器部署于门框两侧，检测距离 3～5 m。
**传输层**：MQTT 网关汇聚传感数据，上报至云服务器。
**处理层**：云服务器判断是否有人靠近，生成开门指令。
**执行层**：电动门控制器接收指令后驱动门体开启。

\`\`\`mermaid
${code}
\`\`\``,
    },
    {
      user: '检测结果显示流程图缺少延时关门分支和大厅联动节点，请改进方案。',
      assistant: (code) => `已根据检测意见更新方案，补充了延时关门逻辑和大厅联动界面。

**新增内容**：
- 人员离开后云服务器触发延时关门分支，避免频繁开关
- 大厅联动界面实时同步门状态，方便管理员监控

\`\`\`mermaid
${code}
\`\`\``,
    },
  ],

  '身份识别': [
    {
      user: '请为「身份识别」功能模块设计物联网施工方案。\n功能需求：\n1. RFID 刷卡验证身份\n2. 验证通过开启门禁闸机\n3. 非法闯入触发声光报警',
      assistant: (code) => `以下是「身份识别」模块初版施工方案。

**感知层**：RFID 读卡器安装于闸机入口，读取距离 10 cm 以内。
**传输层**：MQTT 网关实时上传卡号至云服务器。
**处理层**：云服务器比对白名单数据库，给出验证结论。
**执行层**：验证通过则开启门禁闸机；非法闯入触发声光报警器。

\`\`\`mermaid
${code}
\`\`\``,
    },
    {
      user: '流程图中缺少人流量统计节点，请补充相关功能。',
      assistant: (code) => `已补充人流量统计模块，方案更新如下。

**新增内容**：
- 每次刷卡成功后向人流量数据库写入一条记录
- LED 大屏实时展示进出人数，便于馆内容量管控

\`\`\`mermaid
${code}
\`\`\``,
    },
  ],

  '大厅安防': [
    {
      user: '请为「大厅」功能模块设计物联网施工方案。\n功能需求：\n1. 监测温湿度和CO₂浓度\n2. 超标时控制空调并发出预警',
      assistant: (code) => `以下是「大厅」模块初版施工方案。

**感知层**：温湿度传感器和 CO₂ 传感器布置于大厅顶部，采样间隔 30 s。
**传输层**：MQTT 网关汇聚多路传感数据。
**处理层**：云服务器阈值判断（温度 > 28 ℃ / CO₂ > 1000 ppm 触发告警）。
**执行层**：驱动空调控制器降温，并在预警提示屏显示超标信息。

\`\`\`mermaid
${code}
\`\`\``,
    },
    {
      user: '检测结果指出缺少烟雾和火焰传感器，空调制冷与除湿分支也需明确区分，请改进。',
      assistant: (code) => `已根据意见全面升级方案。

**新增内容**：
- 烟雾传感器 + 火焰传感器接入，触发消防报警系统
- 空调制冷（温度过高）与除湿控制器（湿度过高）拆分为独立执行分支
- 预警展示屏统一汇总所有告警信息

\`\`\`mermaid
${code}
\`\`\``,
    },
  ],

  'LED显示': [
    {
      user: '请为「LED显示」功能模块设计物联网施工方案。\n功能需求：\n1. 显示日期时间和环境温湿度\n2. 内容由云服务器推送至LED大屏',
      assistant: (code) => `以下是「LED显示」模块初版施工方案。

**感知层**：时间模块（NTP 同步）+ 环境传感器提供基础数据。
**传输层**：数据直接上报云服务器（本方案网关可选）。
**处理层**：云服务器聚合时间与环境信息，生成显示内容。
**执行层**：LED 大屏控制器接收推送，驱动显示屏刷新。

\`\`\`mermaid
${code}
\`\`\``,
    },
    {
      user: '请扩展方案，增加安防状态显示和新书通知推送功能，并通过 MQTT 网关接入。',
      assistant: (code) => `已扩展方案，引入 MQTT 网关统一接入各数据源。

**新增内容**：
- 门禁系统安防状态接入 MQTT 网关，实时同步至 LED 大屏
- 云服务器支持新书上架/馆内通知的手动推送，LED 控制器优先显示

\`\`\`mermaid
${code}
\`\`\``,
    },
  ],

  '绿色植物': [
    {
      user: '请为「绿色植物」功能模块设计物联网施工方案。\n功能需求：\n1. 监测土壤湿度\n2. 水分不足时自动浇水',
      assistant: (code) => `以下是「绿色植物」模块初版施工方案。

**感知层**：土壤湿度传感器插入植物根部，采样间隔 5 min。
**传输层**：MQTT 网关上报水分数值至云服务器。
**处理层**：云服务器判断湿度是否低于阈值（如 30 %）。
**执行层**：触发浇水装置开启，浇水完成后上报状态。

\`\`\`mermaid
${code}
\`\`\``,
    },
    {
      user: '请补充水分充足时的待机逻辑，以及浇水完成后自动停止的控制分支。',
      assistant: (code) => `已完善控制逻辑，增加双向反馈机制。

**新增内容**：
- 湿度充足时流程进入「保持待机」分支，避免误触发
- 雾化加湿装置浇水完成后自动上报，云服务器下发停止指令
- 使用菱形判断节点清晰表达阈值决策

\`\`\`mermaid
${code}
\`\`\``,
    },
  ],

  '自助系统': [
    {
      user: '请为「自助系统」功能模块设计物联网施工方案。\n功能需求：\n1. RFID 扫描图书完成借还\n2. 借还成功后打印凭证\n3. 支持书目查询',
      assistant: (code) => `以下是「自助系统」模块初版施工方案。

**感知层**：RFID 扫描仪识别图书标签，触摸屏接收用户操作。
**传输层**：MQTT 网关汇聚请求至图书馆服务器。
**处理层**：服务器处理借还业务并查询书目数据库。
**执行层**：驱动打印机输出凭证，查询结果回显触摸屏终端。

\`\`\`mermaid
${code}
\`\`\``,
    },
    {
      user: '请增加电子阅览终端功能，并将触摸屏纳入 MQTT 网关统一接入。',
      assistant: (code) => `已扩展方案，触摸屏与 RFID 扫描仪统一通过 MQTT 网关接入，新增电子阅览终端。

**新增内容**：
- 触摸屏终端作为传感层节点接入网关，与服务器双向通信
- 电子阅览终端由服务器推送资源，支持馆内在线阅读
- 票据打印机独立于查询终端，减少设备竞争

\`\`\`mermaid
${code}
\`\`\``,
    },
  ],
}

// ── 插入数据 ─────────────────────────────────────────────────
const groupNames = ['第一组', '第二组', '第三组', '第四组']

const groupAreas: Record<string, string[]> = {
  '第一组': ['大门区域', '身份识别'],
  '第二组': ['大厅安防', 'LED显示'],
  '第三组': ['绿色植物', '自助系统'],
  '第四组': ['大门区域', '大厅安防'],
}

for (const name of groupNames) {
  db.query('INSERT INTO groups (name) VALUES (?)').run(name)
  const group = db.query('SELECT id FROM groups WHERE name = ?').get(name) as { id: number }
  const gid = group.id
  const areas = groupAreas[name]

  for (const area of areas) {
    const areaCharts = charts[area] ?? []
    const areaChecks = checkTemplates[area]  // [historyIdx][runIdx] = CR[]

    for (let i = 0; i < areaCharts.length; i++) {
      const code = areaCharts[i]
      const hoursAgo = (areaCharts.length - 1 - i) * 2
      const offset = hoursAgo > 0 ? `-${hoursAgo} hours` : '0 hours'

      db.query(
        `INSERT INTO flowchart_history (group_id, mermaid_code, area, created_at)
         VALUES (?, ?, ?, datetime('now', ?))`
      ).run(gid, code, area, offset)

      const hist = db.query(
        'SELECT id FROM flowchart_history WHERE group_id = ? AND area = ? ORDER BY created_at DESC LIMIT 1'
      ).get(gid, area) as { id: number }

      const runs = areaChecks?.[i] ?? []
      for (let r = 0; r < runs.length; r++) {
        const runOffset = hoursAgo > 0 ? `-${hoursAgo - r * 0.5} hours` : `+${r * 30} minutes`
        db.query(
          `INSERT INTO check_results (group_id, flowchart_history_id, area, results_json, created_at)
           VALUES (?, ?, ?, ?, datetime('now', ?))`
        ).run(gid, hist.id, area, JSON.stringify(runs[r]), runOffset)
      }
    }

    // flowcharts 存最新版
    const latest = areaCharts[areaCharts.length - 1]
    db.query(
      `INSERT INTO flowcharts (group_id, mermaid_code, area, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(group_id) DO UPDATE SET mermaid_code = excluded.mermaid_code, area = excluded.area, updated_at = excluded.updated_at`
    ).run(gid, latest, area)
  }

  // 多轮 AI 对话（每个区域两轮生成，对应流程图历史）
  for (const area of areas) {
    const areaCharts = charts[area] ?? []
    const convRounds = conversationTemplates[area] ?? []
    for (let i = 0; i < convRounds.length && i < areaCharts.length; i++) {
      const hoursAgo = (areaCharts.length - 1 - i) * 2
      const userOffset   = hoursAgo > 0 ? `-${hoursAgo} hours`         : `-10 minutes`
      const assistOffset = hoursAgo > 0 ? `-${hoursAgo - 0.1} hours`   : `0 hours`
      db.query(
        `INSERT INTO messages (group_id, role, content, area, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))`
      ).run(gid, 'user', convRounds[i].user, area, userOffset)
      db.query(
        `INSERT INTO messages (group_id, role, content, area, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))`
      ).run(gid, 'assistant', convRounds[i].assistant(areaCharts[i]), area, assistOffset)
    }
  }
}

console.log('✅ 种子数据写入完成')
console.log(`   ${groupNames.length} 个小组，每组 2 个功能区域`)
console.log(`   每区域 2 次历史流程图，每次含多轮检测记录（体现改进过程）`)

} // end runSeed
