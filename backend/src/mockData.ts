import { db } from './db'
import { groups, stickers, flowchart_history, check_results, messages, flowcharts, device_submissions, device_check_results, journal_placements } from './schema'
import { AREA_REFERENCE_FLOWCHARTS, AREA_DEVICE_NODE_MAPPINGS } from './areaFlowcharts'

const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统']

const AREA_CHECK_ITEMS: Record<string, string[]> = {
  '大门区域': [
    '人体红外传感器检测节点是否存在',
    '有人靠近时自动开门逻辑是否正确',
    '人员离开持续监测是否存在',
    '自动关门逻辑是否正确',
  ],
  '身份识别': [
    'RFID刷卡节点是否存在',
    '身份识别通过/未通过分支是否完整',
    '闸机自动开启与关闭是否联动',
    '非法闯入检测节点是否存在',
    '声光报警触发逻辑是否正确',
  ],
  '大厅安防': [
    '温湿度监测节点是否存在',
    'CO₂浓度监测节点是否存在',
    '空气质量监测节点是否存在',
    '烟雾检测与火灾预警是否联动',
    '火焰检测节点是否存在',
    '环境超标预警逻辑是否完整',
  ],
  'LED显示': [
    '日期时间显示节点是否存在',
    '温湿度数据推送节点是否存在',
    '空气质量数据推送节点是否存在',
    '图书馆通知滚动播放是否存在',
    '安防与门禁状态显示是否存在',
  ],
  '绿色植物': [
    '土壤水分监测节点是否存在',
    '水箱液位检测是否存在',
    '水温检测节点是否存在',
    '加热棒启动逻辑是否正确',
    '雾化加湿启动与停止是否完整',
  ],
  '自助系统': [
    '借书流程中图书标签读取是否存在',
    '借书可借/不可借分支是否完整',
    '还书流程中还书登记是否存在',
    '借还书小票打印节点是否存在',
    '查询续借流程是否完整',
  ],
}

const AREA_DRAFT_FLOWCHARTS: Record<string, string> = {
  '大门区域': `graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef decision fill:#fbbf24,stroke:#d97706,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  A[人体红外传感器持续检测]:::trigger --> B{是否有人靠近?}:::decision
  B -->|有人靠近| C[自动开启大门]:::action
  B -->|无人| A
  C --> D[持续监测人员是否离开]:::trigger
  D --> E[自动关闭大门]:::action
  E --> A`,

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
  B -->|未通过| F[提示刷卡失败]:::display
  F --> A`,

  '大厅安防': `graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef decision fill:#fbbf24,stroke:#d97706,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  A[传感器持续采集]:::trigger --> B[实时监测温湿度]:::trigger
  A --> C[实时监测CO₂浓度]:::trigger
  A --> D[实时监测空气质量]:::trigger
  A --> E[实时监测烟雾]:::trigger
  E --> F{是否检测到烟雾?}:::decision
  F -->|是| G[触发火灾预警]:::action
  F -->|否| A
  B --> H{环境数据是否超标?}:::decision
  C --> H
  D --> H
  H -->|正常| A
  H -->|超标| I[自动发出预警提示]:::action
  I --> A`,

  'LED显示': `graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  classDef display fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[LED大屏启动]:::trigger --> B[实时显示当前日期与时间]:::display
  A --> C[实时推送温湿度环境数据]:::display
  A --> D[实时推送空气质量数据]:::display
  A --> E[滚动播放图书馆通知与新书推荐]:::display
  G[环境传感器数据更新]:::trigger --> C
  G --> D`,

  '绿色植物': `graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef decision fill:#fbbf24,stroke:#d97706,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  A[实时监测绿植土壤水分]:::trigger --> B{水分是否不足?}:::decision
  B -->|否| A
  B -->|是| C{检查水箱液位}:::decision
  C -->|液位不足| D[暂停浇水]:::action
  D --> E[发出液位告警]:::action
  E --> A
  C -->|液位充足| F[启动雾化加湿装置]:::action
  F --> G{水分是否达标?}:::decision
  G -->|否| F
  G -->|是| H[自动停止雾化加湿装置]:::action
  H --> A`,

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
  J --> B`,
}

const AREA_MESSAGES: Record<string, Array<{ role: 'user' | 'assistant'; content: string }>> = {
  '大门区域': [
    { role: 'user', content: '大门区域的流程图需要包含哪些核心节点？' },
    { role: 'assistant', content: '大门区域的流程图核心节点包括：①人体红外传感器持续检测人员靠近；②判断是否有人靠近的决策节点；③自动开启大门的动作；④持续监测人员是否离开；⑤判断人员是否离开的决策节点；⑥自动关闭大门。整个流程形成闭环，大门在无人时保持关闭状态。' },
    { role: 'user', content: '人员离开检测这个节点我遗漏了，应该怎么处理？' },
    { role: 'assistant', content: '在"自动开启大门"动作之后，需要添加一个"持续监测人员是否离开"的触发节点，然后连接判断分支：若人员已离开则执行"自动关闭大门"，若未离开则循环监测。这样才能保证大门在人员通过后及时关闭，而不是一直保持打开状态。' },
    { role: 'user', content: '流程图的判断节点用什么形状表示？' },
    { role: 'assistant', content: '在 Mermaid 流程图中，判断节点用菱形 `{}` 表示，如 `B{是否有人靠近?}`。触发/传感器节点加 `:::trigger` 样式，动作节点加 `:::action` 样式，显示节点加 `:::display` 样式，颜色区分节点类型。' },
  ],
  '身份识别': [
    { role: 'user', content: '身份识别区域的闸机控制逻辑是什么？' },
    { role: 'assistant', content: '身份识别的闸机控制逻辑如下：读者使用RFID标签刷卡后，超高频中距离一体机读取标签信息进行身份验证。验证通过则自动开启闸机，同时更新进出人流量统计，人员通过后闸机自动关闭。验证未通过则需判断是否有非法闯入，若有则触发声光报警装置，否则提示刷卡失败。' },
    { role: 'user', content: '非法闯入检测我没有加上，它和普通刷卡失败有什么区别？' },
    { role: 'assistant', content: '刷卡失败是读者主动刷卡但身份验证未通过，属于正常的失败流程。非法闯入是有人未经刷卡直接强行通过闸机，红外对射传感器检测到通道被遮挡但没有合法的刷卡记录，这种情况需要触发报警灯声光报警。请在"未通过"分支中加入这两种情况的判断。' },
    { role: 'user', content: '修改好了，现在流程图包含了非法闯入检测节点，感谢！' },
    { role: 'assistant', content: '很好！完整的身份识别流程图现在涵盖了正常通行、刷卡失败提示和非法闯入报警三个分支，逻辑完整。如果需要进一步完善，还可以考虑在闸机开启状态下设置超时自动关闭的逻辑。' },
  ],
  '大厅安防': [
    { role: 'user', content: '大厅安防区域有哪些传感器需要体现在流程图中？' },
    { role: 'assistant', content: '大厅安防区域需要体现以下传感器：①温湿度传感器（采集模拟信号）；②空气质量传感器（采集模拟信号）；③二氧化碳传感器（采集模拟信号）；④烟雾传感器（数字信号输出）；⑤火焰传感器（数字信号输出）。各传感器实时采集数据，超标或检测到危险时触发相应的预警或控制动作。' },
    { role: 'user', content: '火焰传感器和烟雾传感器的处理逻辑是一样的吗？' },
    { role: 'assistant', content: '处理逻辑类似但需要分开建模：烟雾传感器和火焰传感器各自有独立的检测节点和判断分支，两者都指向同一个"触发火灾预警"动作节点。这样设计是因为实际中可能只有烟雾没有火焰（早期预警），也可能只有火焰没有浓烟。' },
    { role: 'user', content: '我的流程图里漏了火焰传感器节点，已经补充完整了' },
    { role: 'assistant', content: '补充得很好！大厅安防的流程图现在涵盖：传感器持续采集 → 各类传感器并行监测 → 烟雾/火焰检测触发火灾预警 → 环境数据超标触发预警并自动控制。这种并行的多传感器结构在 Mermaid 中用多条从同一起点出发的连线表示。' },
  ],
  'LED显示': [
    { role: 'user', content: 'LED显示区域流程图需要体现哪些数据来源？' },
    { role: 'assistant', content: 'LED显示区域的数据来源主要有三个：①系统时钟（实时显示当前日期与时间）；②环境传感器数据（温湿度、空气质量，实时推送）；③馆员操作（发布通知、新书推荐）；此外还有④安防/门禁状态变化的联动显示。每个数据来源在流程图中应作为独立的触发节点，分别连接到对应的LED显示动作。' },
    { role: 'user', content: '安防与门禁状态同步显示这个节点我漏掉了' },
    { role: 'assistant', content: '需要添加一个触发节点"安防或门禁状态变化"，连接到"同步显示安防与门禁状态提示"的显示节点。在流程图中，"安防或门禁状态变化"应和"环境传感器数据更新"、"馆员发布新通知"并列，都作为独立的外部触发节点。' },
    { role: 'user', content: '好的，我已经补充了安防状态显示节点，流程图现在完整了' },
    { role: 'assistant', content: '完整了！LED显示区域的流程图体现了LED大屏作为"被动显示终端"的特性——它本身不主动采集数据，而是接收来自多个外部系统的数据推送，通过串口服务器中转后在大屏上显示。串口服务器是数据中转的关键设备，后续在设备放置环节记得把它对应到相关节点上。' },
  ],
  '绿色植物': [
    { role: 'user', content: '绿色植物区域的浇水逻辑涉及哪些条件判断？' },
    { role: 'assistant', content: '绿色植物浇水逻辑包含三层判断：①土壤水分是否不足；②若不足，检查水箱液位是否充足，液位不足则暂停浇水并告警；③若液位充足，检查水温是否偏低，水温偏低则先启动加热棒，水温正常后再启动雾化加湿装置。浇水完成后持续监测直到水分达标，再停止雾化装置。' },
    { role: 'user', content: '我的流程图里没有加水温检测和加热棒，需要补充吗？' },
    { role: 'assistant', content: '需要补充。水温检测是浇水前的重要保护步骤，防止使用过冷的水灌溉对植物造成伤害。在"检查水箱液位"判断通过后，添加"检测水温"节点和对应的判断分支：水温偏低 → 启动加热棒 → 启动雾化加湿装置；水温正常 → 直接启动雾化加湿装置。' },
    { role: 'user', content: '补充完成，现在包含了水温检测和加热棒启动逻辑' },
    { role: 'assistant', content: '很好！注意雾化加湿装置启动后需要持续判断水分是否达标（循环监测），达标后才停止雾化，这样可以避免过度浇水。确认你的流程图中有这个循环检测的逻辑。' },
  ],
  '自助系统': [
    { role: 'user', content: '自助借还系统的借书和还书流程有什么区别？' },
    { role: 'assistant', content: '借书流程：读取图书RFID标签 → 查询图书是否可借 → 可借则完成借书登记并打印借书小票，不可借则提示图书状态。还书流程：读取图书RFID标签 → 直接完成还书登记 → 打印还书小票。主要区别在于借书需要判断图书是否可借，而还书流程相对简单，直接登记即可。' },
    { role: 'user', content: '查询续借功能需要单独的分支吗？' },
    { role: 'assistant', content: '需要。查询续借是独立的操作分支：读者选择"查询续借" → 读取图书标签，查询图书信息或借阅记录 → 展示查询结果 → 读者决定是否续借 → 选择续借则完成续借登记，不续借则结束。超高频中距离一体机与借书还书共用设备，在设备放置时需要将该设备贴纸放置在多个相关节点上。' },
    { role: 'user', content: '明白了，我已经加上了查询续借的分支，流程图完整了' },
    { role: 'assistant', content: '很好！完整的自助系统流程图包含三个主分支：借书（有可借/不可借判断）、还书（直接登记）、查询续借（有是否续借判断）。注意小票打印机只在借书成功和还书完成后使用，续借完成后不打印小票。请检查你的流程图中小票打印节点的位置是否正确。' },
  ],
}

type GroupProfile = {
  areasCompleted: number
  areasInProgress: number
  failRate: number
  threeRoundAreas: number[]
  deviceFails: Record<number, number>
  speed: number
  msgCount: number
}

const GROUP_PROFILES: GroupProfile[] = [
  { areasCompleted: 6, areasInProgress: 0, failRate: 0.25, threeRoundAreas: [],     deviceFails: {},     speed: 0.9, msgCount: 4 },
  { areasCompleted: 4, areasInProgress: 1, failRate: 0.55, threeRoundAreas: [1],    deviceFails: {2: 2}, speed: 1.4, msgCount: 6 },
  { areasCompleted: 6, areasInProgress: 0, failRate: 0.38, threeRoundAreas: [],     deviceFails: {0: 1}, speed: 0.8, msgCount: 4 },
  { areasCompleted: 5, areasInProgress: 1, failRate: 0.35, threeRoundAreas: [3],    deviceFails: {4: 3}, speed: 1.1, msgCount: 5 },
  { areasCompleted: 6, areasInProgress: 0, failRate: 0.10, threeRoundAreas: [],     deviceFails: {},     speed: 0.7, msgCount: 3 },
  { areasCompleted: 3, areasInProgress: 2, failRate: 0.70, threeRoundAreas: [0, 2], deviceFails: {1: 4}, speed: 1.8, msgCount: 6 },
]

function getFailingIndices(itemCount: number, failRate: number, gi: number, ai: number): Set<number> {
  const count = Math.min(itemCount - 1, Math.max(0, Math.round(itemCount * failRate)))
  const start = (gi * 3 + ai * 2) % itemCount
  const failing = new Set<number>()
  for (let i = 0; i < count; i++) {
    failing.add((start + i) % itemCount)
  }
  return failing
}

function formatTs(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

export function runMockData() {
  const groupList = db.select({ id: groups.id, name: groups.name }).from(groups).orderBy(groups.name).all()
  if (groupList.length === 0) throw new Error('请先加载种子数据')

  const stickerList = db.select({ id: stickers.id, name: stickers.name, filename: stickers.filename }).from(stickers).all()
  const stickerByName = new Map(stickerList.map(s => [s.name, { id: s.id, filename: s.filename }]))

  const BASE_TIME = Date.now() - 3 * 60 * 60 * 1000

  for (let gi = 0; gi < groupList.length; gi++) {
    const group = groupList[gi]
    const profile = GROUP_PROFILES[gi % GROUP_PROFILES.length]
    const { areasCompleted, areasInProgress, failRate, threeRoundAreas, deviceFails, speed, msgCount } = profile

    for (let ai = 0; ai < AREAS.length; ai++) {
      const areaState =
        ai < areasCompleted ? 'completed'
        : ai < areasCompleted + areasInProgress ? 'inProgress'
        : 'notStarted'

      if (areaState === 'notStarted') continue

      const area = AREAS[ai]
      const checkItems = AREA_CHECK_ITEMS[area]
      const draftCode = AREA_DRAFT_FLOWCHARTS[area]
      const finalCode = AREA_REFERENCE_FLOWCHARTS[area]
      const nodeMappings = AREA_DEVICE_NODE_MAPPINGS[area] ?? []
      const msgs = AREA_MESSAGES[area]
      const isThreeRounds = threeRoundAreas.includes(ai)

      const baseTs = BASE_TIME + ai * 30 * 60 * 1000
      const T = (min: number) => baseTs + Math.round(min * speed * 60 * 1000)

      const failingIdx = getFailingIndices(checkItems.length, failRate, gi, ai)
      const h1 = db.insert(flowchart_history).values({
        group_id: group.id,
        area,
        mermaid_code: draftCode,
        user_prompt: `请帮我生成${area}的流程图`,
        created_at: formatTs(new Date(T(0))),
      }).returning({ id: flowchart_history.id }).get()

      db.insert(check_results).values({
        group_id: group.id,
        flowchart_history_id: h1.id,
        area,
        results_json: JSON.stringify(checkItems.map((item, idx) => ({
          passed: !failingIdx.has(idx),
          comment: failingIdx.has(idx)
            ? `未检测到相关节点，请补充${item.replace(/是否.*/, '')}的相关节点`
            : '符合要求',
        }))),
        created_at: formatTs(new Date(T(2))),
      }).run()

      const selectedMsgs = msgs.slice(0, Math.min(msgCount, msgs.length))
      for (let mi = 0; mi < selectedMsgs.length; mi++) {
        db.insert(messages).values({
          group_id: group.id,
          role: selectedMsgs[mi].role,
          content: selectedMsgs[mi].content,
          area,
          created_at: formatTs(new Date(T(mi * 3))),
        }).run()
      }

      if (areaState === 'inProgress') continue

      let finalSubmitMin: number

      if (isThreeRounds) {
        const round2FailIdx = Array.from(failingIdx)[0] ?? 0
        const h2 = db.insert(flowchart_history).values({
          group_id: group.id,
          area,
          mermaid_code: draftCode,
          user_prompt: '我修改了一部分，请再帮我检查',
          created_at: formatTs(new Date(T(12))),
        }).returning({ id: flowchart_history.id }).get()

        db.insert(check_results).values({
          group_id: group.id,
          flowchart_history_id: h2.id,
          area,
          results_json: JSON.stringify(checkItems.map((item, idx) => ({
            passed: idx !== round2FailIdx,
            comment: idx === round2FailIdx
              ? `仍未检测到${item.replace(/是否.*/, '')}的节点，请继续完善`
              : '符合要求',
          }))),
          created_at: formatTs(new Date(T(14))),
        }).run()

        const h3 = db.insert(flowchart_history).values({
          group_id: group.id,
          area,
          mermaid_code: finalCode,
          user_prompt: '已全部修改，请重新检查',
          created_at: formatTs(new Date(T(22))),
        }).returning({ id: flowchart_history.id }).get()

        db.insert(check_results).values({
          group_id: group.id,
          flowchart_history_id: h3.id,
          area,
          results_json: JSON.stringify(checkItems.map(() => ({ passed: true, comment: '符合要求' }))),
          created_at: formatTs(new Date(T(24))),
        }).run()
        finalSubmitMin = 22
      } else {
        const h2 = db.insert(flowchart_history).values({
          group_id: group.id,
          area,
          mermaid_code: finalCode,
          user_prompt: '已修改，请重新检查',
          created_at: formatTs(new Date(T(12))),
        }).returning({ id: flowchart_history.id }).get()

        db.insert(check_results).values({
          group_id: group.id,
          flowchart_history_id: h2.id,
          area,
          results_json: JSON.stringify(checkItems.map(() => ({ passed: true, comment: '符合要求' }))),
          created_at: formatTs(new Date(T(14))),
        }).run()
        finalSubmitMin = 12
      }

      db.insert(flowcharts)
        .values({ group_id: group.id, area, mermaid_code: finalCode, updated_at: formatTs(new Date(T(finalSubmitMin))) })
        .onConflictDoUpdate({
          target: flowcharts.group_id,
          set: { area, mermaid_code: finalCode, updated_at: formatTs(new Date(T(finalSubmitMin))) },
        })
        .run()

      const deviceSubmitMin = finalSubmitMin + 6
      const placements = nodeMappings.flatMap(({ node, devices }, nodeIdx) =>
        devices
          .map((deviceName, devIdx) => {
            const stickerEntry = stickerByName.get(deviceName) ?? null
            if (!stickerEntry) return null
            return {
              sticker_id: stickerEntry.id,
              node_id: node,
              node_label: node,
              sticker_name: deviceName,
              sticker_filename: stickerEntry.filename,
              x: 100 + nodeIdx * 120 + devIdx * 20,
              y: 100 + nodeIdx * 80,
            }
          })
          .filter(Boolean)
      )

      const sub = db.insert(device_submissions).values({
        group_id: group.id,
        area,
        placements_json: JSON.stringify(placements),
        mermaid_code: finalCode,
        created_at: formatTs(new Date(T(deviceSubmitMin))),
      }).returning({ id: device_submissions.id }).get()

      const deviceFailCount = deviceFails[ai] ?? 0
      let deviceFailsSeen = 0
      const deviceCheckItems = nodeMappings.flatMap(({ node, devices }) =>
        devices.map((deviceName) => {
          const fail = deviceFailsSeen < deviceFailCount
          if (fail) deviceFailsSeen++
          return {
            device_name: deviceName,
            node_label: node,
            passed: !fail,
            comment: fail
              ? `${deviceName}与节点"${node}"的对应关系有误，请重新确认`
              : '设备放置正确',
          }
        })
      )
      db.insert(device_check_results).values({
        group_id: group.id,
        submission_id: sub.id,
        area,
        results_json: JSON.stringify(deviceCheckItems),
        created_at: formatTs(new Date(T(deviceSubmitMin + 2))),
      }).run()

      for (let ni = 0; ni < nodeMappings.length; ni++) {
        const { node, devices } = nodeMappings[ni]
        for (let di = 0; di < devices.length; di++) {
          const stickerEntry = stickerByName.get(devices[di])
          if (!stickerEntry) continue
          db.insert(journal_placements).values({
            group_id: group.id,
            area,
            sticker_id: stickerEntry.id,
            node_id: node,
            node_label: node,
            x: 80 + ni * 130 + di * 25,
            y: 80 + ni * 90,
            scale: 1.0,
          }).run()
        }
      }
    }
  }

  console.log('✅ 模拟数据生成完成')
  console.log(`   ${groupList.length} 个小组 × ${AREAS.length} 个区域`)
}
