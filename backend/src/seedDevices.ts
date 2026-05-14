export type SeedDevice = {
  name: string
  description: string
  install_location: string
  theme_color: string
}

export const seedDevices: SeedDevice[] = [
  // 大门区域
  { name: '人体红外传感器', description: '安装在大门两侧，持续检测人员靠近与离开，联动控制大门启闭', install_location: '大门区域', theme_color: '#3182ce' },

  // 身份识别
  { name: '超高频中距离一体机', description: '安装在门闸检测口，读取读者超高频标签完成身份识别，统计进出人流量', install_location: '身份识别', theme_color: '#5a67d8' },
  { name: '超高频标签', description: '读者随身携带，存储身份信息供门禁识别', install_location: '身份识别', theme_color: '#5a67d8' },
  { name: '闸机', description: '安装在门闸通道，身份识别通过后自动开启，人员通过后自动关闭', install_location: '身份识别', theme_color: '#6b7280' },
  { name: '红外对射传感器', description: '安装在门闸两侧，检测通道是否被遮挡以判断非法闯入', install_location: '身份识别', theme_color: '#3182ce' },
  { name: '报警灯', description: '安装在门闸上方，非法闯入时声光报警', install_location: '身份识别', theme_color: '#e53e3e' },

  // 大厅安防
  { name: '温湿度传感器', description: '安装在大厅墙面靠上位置，实时采集温湿度模拟信号', install_location: '大厅安防', theme_color: '#0ea5e9' },
  { name: '空气质量传感器', description: '安装在大厅墙面靠上位置，实时采集空气质量模拟信号', install_location: '大厅安防', theme_color: '#0ea5e9' },
  { name: '二氧化碳传感器', description: '安装在大厅墙面靠上位置，实时采集CO₂浓度模拟信号', install_location: '大厅安防', theme_color: '#0ea5e9' },
  { name: '烟雾传感器', description: '安装在顶棚，无遮挡区域，输出数字信号', install_location: '大厅安防', theme_color: '#e53e3e' },
  { name: '火焰传感器', description: '安装在顶棚，无遮挡区域，输出数字信号', install_location: '大厅安防', theme_color: '#e53e3e' },

  // LED显示
  { name: 'LED显示器', description: '安装在大堂墙面高处，展示时间、环境数据、通知及安防状态', install_location: 'LED显示', theme_color: '#805ad5' },
  { name: '串口服务器', description: '安装在设备间，负责系统与LED显示器之间的数据中转', install_location: 'LED显示', theme_color: '#805ad5' },

  // 绿色植物
  { name: '土壤水分传感器', description: '插入绿植土壤，实时监测含水量', install_location: '绿色植物', theme_color: '#38a169' },
  { name: '液位传感器', description: '安装在水箱内壁，监测水箱液位', install_location: '绿色植物', theme_color: '#0ea5e9' },
  { name: '水温传感器', description: '安装在水箱内，监测水温防止过冷', install_location: '绿色植物', theme_color: '#0ea5e9' },
  { name: '雾化器', description: '安装在绿植旁，土壤水分不足时进行加湿浇水', install_location: '绿色植物', theme_color: '#38a169' },
  { name: '加热棒', description: '安装在水箱内，水温偏低时自动加热', install_location: '绿色植物', theme_color: '#dd6b20' },

  // 自助系统
  { name: '超高频中距离一体机', description: '安装在自助借还台，读取图书标签完成借还、查询与续借', install_location: '自助系统', theme_color: '#5a67d8' },
  { name: '超高频标签', description: '粘贴在图书上，存储图书信息供自助借还识别', install_location: '自助系统', theme_color: '#5a67d8' },
  { name: '小票打印机', description: '放置在自助借还台，借还成功后自动打印小票凭证', install_location: '自助系统', theme_color: '#d53f8c' },
]
