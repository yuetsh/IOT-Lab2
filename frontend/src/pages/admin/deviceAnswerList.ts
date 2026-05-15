export interface DeviceAnswerRow {
  area: string
  node: string
  devices: string[]
}

export interface DeviceAnswerAreaColor {
  background: string
  accent: string
  text: string
}

export const DEVICE_ANSWER_BUTTON_LABEL = '答案清单'
export const DEVICE_ANSWER_DIALOG_TITLE = '设备选型答案清单'

export const DEVICE_ANSWER_AREA_COLORS: Record<string, DeviceAnswerAreaColor> = {
  '大门区域': { background: '#ebf8ff', accent: '#3182ce', text: '#2b6cb0' },
  '身份识别': { background: '#f0fff4', accent: '#38a169', text: '#276749' },
  '大厅安防': { background: '#fff5f5', accent: '#e53e3e', text: '#c53030' },
  'LED显示': { background: '#fffff0', accent: '#d69e2e', text: '#975a16' },
  '绿色植物': { background: '#f0fdf4', accent: '#16a34a', text: '#166534' },
  '自助系统': { background: '#faf5ff', accent: '#805ad5', text: '#6b46c1' },
}

export const DEVICE_ANSWER_LIST: DeviceAnswerRow[] = [
  { area: '大门区域', node: '人体红外传感器持续检测', devices: ['人体红外传感器'] },
  { area: '大门区域', node: '自动开启大门', devices: ['人体红外传感器'] },
  { area: '大门区域', node: '持续监测人员是否离开', devices: ['人体红外传感器'] },
  { area: '大门区域', node: '自动关闭大门', devices: ['人体红外传感器'] },

  { area: '身份识别', node: '读者RFID刷卡', devices: ['超高频中距离一体机', '超高频标签'] },
  { area: '身份识别', node: '自动开启闸机', devices: ['闸机'] },
  { area: '身份识别', node: '实时更新进出人流量统计', devices: ['超高频中距离一体机'] },
  { area: '身份识别', node: '闸机自动关闭', devices: ['闸机'] },
  { area: '身份识别', node: '检测是否有非法闯入', devices: ['红外对射传感器'] },
  { area: '身份识别', node: '触发声光报警装置', devices: ['报警灯'] },

  { area: '大厅安防', node: '实时监测温湿度', devices: ['温湿度传感器'] },
  { area: '大厅安防', node: '实时监测CO₂浓度', devices: ['二氧化碳传感器'] },
  { area: '大厅安防', node: '实时监测空气质量', devices: ['空气质量传感器'] },
  { area: '大厅安防', node: '实时监测烟雾', devices: ['烟雾传感器'] },
  { area: '大厅安防', node: '实时监测火焰', devices: ['火焰传感器'] },

  { area: 'LED显示', node: '实时显示当前日期与时间', devices: ['串口服务器', 'LED显示器'] },
  { area: 'LED显示', node: '实时推送温湿度环境数据', devices: ['串口服务器', 'LED显示器'] },
  { area: 'LED显示', node: '实时推送空气质量数据', devices: ['串口服务器', 'LED显示器'] },
  { area: 'LED显示', node: '滚动播放图书馆通知与新书推荐', devices: ['串口服务器', 'LED显示器'] },
  { area: 'LED显示', node: '同步显示安防与门禁状态提示', devices: ['串口服务器', 'LED显示器'] },

  { area: '绿色植物', node: '实时监测绿植土壤水分', devices: ['土壤水分传感器'] },
  { area: '绿色植物', node: '检查水箱液位', devices: ['液位传感器'] },
  { area: '绿色植物', node: '检测水温', devices: ['水温传感器'] },
  { area: '绿色植物', node: '启动加热棒', devices: ['加热棒'] },
  { area: '绿色植物', node: '启动雾化加湿装置', devices: ['雾化器'] },
  { area: '绿色植物', node: '自动停止雾化加湿装置', devices: ['雾化器'] },

  { area: '自助系统', node: '读取图书标签', devices: ['超高频中距离一体机', '超高频标签'] },
  { area: '自助系统', node: '查询图书信息或借阅记录', devices: ['超高频中距离一体机', '超高频标签'] },
  { area: '自助系统', node: '完成续借登记', devices: ['超高频中距离一体机', '超高频标签'] },
  { area: '自助系统', node: '打印借书小票', devices: ['小票打印机'] },
  { area: '自助系统', node: '打印还书小票', devices: ['小票打印机'] },
]
