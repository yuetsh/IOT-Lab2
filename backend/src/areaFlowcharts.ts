export const AREA_DEVICE_NODE_MAPPINGS: Record<string, { node: string; devices: string[] }[]> = {
  '大门区域': [
    { node: '人体红外传感器持续检测', devices: ['人体红外传感器'] },
    { node: '自动开启大门', devices: ['人体红外传感器'] },
    { node: '持续监测人员是否离开', devices: ['人体红外传感器'] },
    { node: '自动关闭大门', devices: ['人体红外传感器'] },
  ],
  '身份识别': [
    { node: '读者RFID刷卡', devices: ['超高频中距离一体机', '超高频标签'] },
    { node: '自动开启闸机', devices: ['闸机'] },
    { node: '实时更新进出人流量统计', devices: ['超高频中距离一体机'] },
    { node: '闸机自动关闭', devices: ['闸机'] },
    { node: '检测是否有非法闯入', devices: ['红外对射传感器'] },
    { node: '触发声光报警装置', devices: ['报警灯'] },
  ],
  '大厅安防': [
    { node: '实时监测温湿度', devices: ['温湿度传感器'] },
    { node: '实时监测CO₂浓度', devices: ['二氧化碳传感器'] },
    { node: '实时监测空气质量', devices: ['空气质量传感器'] },
    { node: '实时监测烟雾', devices: ['烟雾传感器'] },
    { node: '实时监测火焰', devices: ['火焰传感器'] },
  ],
  'LED显示': [
    { node: '实时显示当前日期与时间', devices: ['串口服务器', 'LED显示器'] },
    { node: '实时推送温湿度环境数据', devices: ['串口服务器', 'LED显示器'] },
    { node: '实时推送空气质量数据', devices: ['串口服务器', 'LED显示器'] },
    { node: '滚动播放图书馆通知与新书推荐', devices: ['串口服务器', 'LED显示器'] },
    { node: '同步显示安防与门禁状态提示', devices: ['串口服务器', 'LED显示器'] },
  ],
  '绿色植物': [
    { node: '实时监测绿植土壤水分', devices: ['土壤水分传感器'] },
    { node: '检查水箱液位', devices: ['液位传感器'] },
    { node: '检测水温', devices: ['水温传感器'] },
    { node: '启动加热棒', devices: ['加热棒'] },
    { node: '启动雾化加湿装置', devices: ['雾化器'] },
    { node: '自动停止雾化加湿装置', devices: ['雾化器'] },
  ],
  '自助系统': [
    { node: '读取图书标签', devices: ['超高频中距离一体机', '超高频标签'] },
    { node: '查询图书信息或借阅记录', devices: ['超高频中距离一体机', '超高频标签'] },
    { node: '完成续借登记', devices: ['超高频中距离一体机', '超高频标签'] },
    { node: '打印借书小票', devices: ['小票打印机'] },
    { node: '打印还书小票', devices: ['小票打印机'] },
  ],
}

export const AREA_REFERENCE_FLOWCHARTS: Record<string, string> = {
  '大门区域': `graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef decision fill:#fbbf24,stroke:#d97706,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  classDef display fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[人体红外传感器持续检测]:::trigger --> B{是否有人靠近?}:::decision
  B -->|有人靠近| C[自动开启大门]:::action
  B -->|无人| A
  C --> D[持续监测人员是否离开]:::trigger
  D --> E{人员是否离开?}:::decision
  E -->|否| D
  E -->|是| F[自动关闭大门]:::action
  F --> A`,

  '身份识别': `graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef decision fill:#fbbf24,stroke:#d97706,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  classDef display fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[读者RFID刷卡]:::trigger --> B{身份识别是否通过?}:::decision
  B -->|通过| C[自动开启闸机]:::action
  C --> D[实时更新进出人流量统计]:::action
  D --> E[闸机自动关闭]:::action
  E --> A
  B -->|未通过| F{检测是否有非法闯入?}:::decision
  F -->|是| G[触发声光报警装置]:::action
  F -->|否| H[提示刷卡失败]:::display
  H --> A`,

  '大厅安防': `graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef decision fill:#fbbf24,stroke:#d97706,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  classDef display fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[传感器持续采集]:::trigger --> B[实时监测温湿度]:::trigger
  A --> C[实时监测CO₂浓度]:::trigger
  A --> D[实时监测空气质量]:::trigger
  A --> E[实时监测烟雾]:::trigger
  A --> F[实时监测火焰]:::trigger
  E --> G{是否检测到烟雾?}:::decision
  G -->|是| H[触发火灾预警]:::action
  G -->|否| A
  F --> I{是否检测到火焰?}:::decision
  I -->|是| H
  I -->|否| A
  B --> J{环境数据是否超标?}:::decision
  C --> J
  D --> J
  J -->|正常| A
  J -->|超标| K[自动发出预警提示]:::action
  K --> L{判断超标类型}:::decision
  L -->|温度过高| M[自动开启空调制冷]:::action
  L -->|湿度过高| N[自动开启除湿]:::action
  M --> A
  N --> A`,

  'LED显示': `graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef decision fill:#fbbf24,stroke:#d97706,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  classDef display fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[LED大屏启动]:::trigger --> B[实时显示当前日期与时间]:::display
  A --> C[实时推送温湿度环境数据]:::display
  A --> D[实时推送空气质量数据]:::display
  A --> E[滚动播放图书馆通知与新书推荐]:::display
  A --> F[同步显示安防与门禁状态提示]:::display
  G[环境传感器数据更新]:::trigger --> C
  G --> D
  H[安防或门禁状态变化]:::trigger --> F
  I[馆员发布新通知]:::trigger --> E`,

  '绿色植物': `graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef decision fill:#fbbf24,stroke:#d97706,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  classDef display fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[实时监测绿植土壤水分]:::trigger --> B{水分是否不足?}:::decision
  B -->|否| A
  B -->|是| C{检查水箱液位}:::decision
  C -->|液位不足| D[暂停浇水]:::action
  D --> E[发出液位告警]:::action
  E --> A
  C -->|液位充足| F{检测水温}:::decision
  F -->|水温偏低| G[启动加热棒]:::action
  G --> H[启动雾化加湿装置]:::action
  F -->|水温正常| H
  H --> I{水分是否达标?}:::decision
  I -->|否| H
  I -->|是| J[自动停止雾化加湿装置]:::action
  J --> A`,

  '自助系统': `graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef decision fill:#fbbf24,stroke:#d97706,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  classDef display fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[读者到达自助终端]:::trigger --> B{选择操作}:::decision
  B -->|借书| C[读取图书标签]:::trigger
  C --> D{图书是否可借?}:::decision
  D -->|可借| E[完成借书登记]:::action
  E --> F[打印借书小票]:::action
  F --> B
  D -->|不可借| G[提示图书状态]:::display
  G --> B
  B -->|还书| H[读取图书标签]:::trigger
  H --> I[完成还书登记]:::action
  I --> J[打印还书小票]:::action
  J --> B
  B -->|查询续借| K[查询图书信息或借阅记录]:::trigger
  K --> L{是否续借?}:::decision
  L -->|是| M[完成续借登记]:::action
  M --> B
  L -->|否| N[展示查询结果]:::display
  N --> B`,
}
