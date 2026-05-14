import { useEffect, useState } from 'react'

interface Sticker { id: number; name: string; theme_color: string }

interface Row {
  area: string
  function: string
  device: string
}

const DATA: Row[] = [
  { area: '大门区域', function: '检测是否有人', device: '人体红外传感器' },
  { area: '大门区域', function: '检测是否有人', device: 'ADAM-4150数字量采集器' },
  { area: '大门区域', function: '自动开启大门', device: 'ADAM-4150数字量采集器' },
  { area: '大门区域', function: '自动关闭大门', device: 'ADAM-4150数字量采集器' },

  { area: '身份识别', function: 'RFID 刷卡', device: '超高频中距离一体机' },
  { area: '身份识别', function: 'RFID 刷卡', device: '超高频标签' },
  { area: '身份识别', function: '身份识别是否通过', device: '超高频中距离一体机' },
  { area: '身份识别', function: '身份识别是否通过', device: 'ADAM-4150数字量采集器' },
  { area: '身份识别', function: '自动开启闸机', device: 'ADAM-4150数字量采集器' },
  { area: '身份识别', function: '自动开启闸机', device: '继电器' },
  { area: '身份识别', function: '自动开启闸机', device: 'LED灯' },
  { area: '身份识别', function: '闸机关闭', device: 'ADAM-4150数字量采集器' },
  { area: '身份识别', function: '闸机关闭', device: '继电器' },
  { area: '身份识别', function: '更新进出人流量统计', device: '超高频中距离一体机' },
  { area: '身份识别', function: '更新进出人流量统计', device: 'ADAM-4150数字量采集器' },
  { area: '身份识别', function: '检测是否有非法闯入', device: '红外对射传感器' },
  { area: '身份识别', function: '检测是否有非法闯入', device: 'ADAM-4150数字量采集器' },
  { area: '身份识别', function: '触发声光报警装置', device: 'LED灯' },
  { area: '身份识别', function: '触发声光报警装置', device: '报警灯' },

  { area: '大厅安防', function: '监测温湿度', device: '温湿度传感器' },
  { area: '大厅安防', function: '监测温湿度', device: 'ADAM-4017模拟量采集器' },
  { area: '大厅安防', function: '监测 CO₂ 浓度', device: '二氧化碳传感器' },
  { area: '大厅安防', function: '监测 CO₂ 浓度', device: 'ADAM-4017模拟量采集器' },
  { area: '大厅安防', function: '监测空气质量', device: '空气质量传感器' },
  { area: '大厅安防', function: '监测空气质量', device: 'ADAM-4017模拟量采集器' },
  { area: '大厅安防', function: '监测烟雾', device: '烟雾传感器' },
  { area: '大厅安防', function: '监测烟雾', device: 'ADAM-4150数字量采集器' },
  { area: '大厅安防', function: '监测火焰', device: '火焰传感器' },
  { area: '大厅安防', function: '监测火焰', device: 'ADAM-4150数字量采集器' },
  { area: '大厅安防', function: '触发火灾预警', device: 'ADAM-4150数字量采集器' },
  { area: '大厅安防', function: '自动发出预警提示', device: 'ADAM-4150数字量采集器' },
  { area: '大厅安防', function: '自动开启空调制冷', device: 'ADAM-4150数字量采集器' },
  { area: '大厅安防', function: '自动开启除湿', device: 'ADAM-4150数字量采集器' },

  { area: 'LED 显示', function: '实时显示日期与时间', device: '串口服务器' },
  { area: 'LED 显示', function: '实时显示日期与时间', device: 'LED显示器' },
  { area: 'LED 显示', function: '实时推送温湿度与空气质量', device: '串口服务器' },
  { area: 'LED 显示', function: '实时推送温湿度与空气质量', device: 'LED显示器' },
  { area: 'LED 显示', function: '滚动播放通知与新书推荐', device: '串口服务器' },
  { area: 'LED 显示', function: '滚动播放通知与新书推荐', device: 'LED显示器' },
  { area: 'LED 显示', function: '同步显示安防与门禁状态', device: '串口服务器' },
  { area: 'LED 显示', function: '同步显示安防与门禁状态', device: 'LED显示器' },

  { area: '绿色植物', function: '实时监测土壤水分', device: '土壤水分传感器' },
  { area: '绿色植物', function: '实时监测土壤水分', device: 'ZigBee四输入量采集器' },
  { area: '绿色植物', function: '实时监测土壤水分', device: 'ZigBee协调器' },
  { area: '绿色植物', function: '检查水箱液位', device: '液位传感器' },
  { area: '绿色植物', function: '检查水箱液位', device: 'ZigBee四输入量采集器' },
  { area: '绿色植物', function: '检查水箱液位', device: 'ZigBee协调器' },
  { area: '绿色植物', function: '检测水温', device: '水温传感器' },
  { area: '绿色植物', function: '检测水温', device: 'ZigBee四输入量采集器' },
  { area: '绿色植物', function: '检测水温', device: 'ZigBee协调器' },
  { area: '绿色植物', function: '启动加热棒', device: '加热棒' },
  { area: '绿色植物', function: '启动加热棒', device: '智能插座' },
  { area: '绿色植物', function: '启动加热棒', device: 'ADAM-4150数字量采集器' },
  { area: '绿色植物', function: '启动雾化加湿装置', device: '雾化器' },
  { area: '绿色植物', function: '启动雾化加湿装置', device: '水箱' },
  { area: '绿色植物', function: '启动雾化加湿装置', device: '智能插座' },
  { area: '绿色植物', function: '启动雾化加湿装置', device: 'ADAM-4150数字量采集器' },
  { area: '绿色植物', function: '启动浇水装置', device: '水箱' },
  { area: '绿色植物', function: '启动浇水装置', device: '智能插座' },
  { area: '绿色植物', function: '启动浇水装置', device: 'ADAM-4150数字量采集器' },
  { area: '绿色植物', function: '自动停止浇水装置', device: '智能插座' },
  { area: '绿色植物', function: '自动停止浇水装置', device: 'ADAM-4150数字量采集器' },
  { area: '绿色植物', function: '暂停浇水', device: '智能插座' },
  { area: '绿色植物', function: '暂停浇水', device: 'ADAM-4150数字量采集器' },
  { area: '绿色植物', function: '发出液位告警', device: '智能插座' },
  { area: '绿色植物', function: '发出液位告警', device: 'ADAM-4150数字量采集器' },

  { area: '自助系统', function: '扫描图书条码（借书）', device: '超高频中距离一体机' },
  { area: '自助系统', function: '扫描图书条码（借书）', device: '超高频标签' },
  { area: '自助系统', function: '扫描图书条码（借书）', device: '电子扫描枪' },
  { area: '自助系统', function: '扫描图书条码（还书）', device: '超高频中距离一体机' },
  { area: '自助系统', function: '扫描图书条码（还书）', device: '超高频标签' },
  { area: '自助系统', function: '扫描图书条码（还书）', device: '电子扫描枪' },
  { area: '自助系统', function: '查询借阅记录', device: '超高频中距离一体机' },
  { area: '自助系统', function: '查询借阅记录', device: '超高频标签' },
  { area: '自助系统', function: '完成续借登记', device: '超高频中距离一体机' },
  { area: '自助系统', function: '完成续借登记', device: '超高频标签' },
  { area: '自助系统', function: '打印借书小票', device: '小票打印机' },
  { area: '自助系统', function: '打印还书小票', device: '小票打印机' },
]

const AREA_COLORS: Record<string, string> = {
  '大门区域': '#ebf8ff',
  '身份识别': '#f0fff4',
  '大厅安防': '#fff5f5',
  'LED 显示': '#fffff0',
  '绿色植物': '#f0fdf4',
  '自助系统': '#faf5ff',
}

function buildRows() {
  type Cell = { value: string; rowSpan: number }
  type TableRow = { area: Cell | null; func: Cell | null; device: string; areaKey: string }

  const rows: TableRow[] = []

  let i = 0
  while (i < DATA.length) {
    const areaStart = i
    const areaVal = DATA[i].area
    while (i < DATA.length && DATA[i].area === areaVal) i++
    const areaSpan = i - areaStart

    let j = areaStart
    while (j < i) {
      const funcStart = j
      const funcVal = DATA[j].function
      while (j < i && DATA[j].function === funcVal) j++
      const funcSpan = j - funcStart

      for (let k = funcStart; k < j; k++) {
        rows.push({
          area: k === areaStart ? { value: areaVal, rowSpan: areaSpan } : null,
          func: k === funcStart ? { value: funcVal, rowSpan: funcSpan } : null,
          device: DATA[k].device,
          areaKey: areaVal,
        })
      }
    }
  }

  return rows
}

const ROWS = buildRows()

export default function AdminDataView() {
  const [stickerMap, setStickerMap] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/stickers')
      .then(r => r.json())
      .then((list: Sticker[]) => {
        const map: Record<string, string> = {}
        for (const s of list) map[s.name] = s.theme_color
        setStickerMap(map)
      })
  }, [])

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a202c', marginBottom: 24 }}>数据展示</h2>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
          <thead>
            <tr style={{ background: '#f7fafc' }}>
              {['功能区域', '功能节点', '对应设备'].map(h => (
                <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 600, color: '#4a5568', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                {row.area && (
                  <td rowSpan={row.area.rowSpan} style={{ padding: '10px 18px', fontWeight: 600, verticalAlign: 'middle', background: AREA_COLORS[row.areaKey] ?? '#fafafa', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    {row.area.value}
                  </td>
                )}
                {row.func && (
                  <td rowSpan={row.func.rowSpan} style={{ padding: '10px 18px', verticalAlign: 'middle', color: '#2d3748', borderRight: '1px solid #e2e8f0' }}>
                    {row.func.value}
                  </td>
                )}
                <td style={{ padding: '10px 18px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {stickerMap[row.device] && (
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: stickerMap[row.device], flexShrink: 0, display: 'inline-block' }} />
                    )}
                    <span style={{ color: '#4a5568' }}>{row.device}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
