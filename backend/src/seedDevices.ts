export type SeedDevice = {
  name: string
  description: string
  install_location: string
  theme_color: string
}

export const seedDevices: SeedDevice[] = [
  // 大门区域
  { name: '人体红外传感器', description: '安装在大门两侧，检测人员靠近与离开', install_location: '大门区域', theme_color: '#3182ce' },

  // 身份识别
  { name: '超高频中距离一体机', description: '安装在门闸检测口，读取读者超高频标签完成身份识别', install_location: '身份识别', theme_color: '#5a67d8' },
  { name: '超高频标签', description: '读者随身携带，存储身份信息；图书上的标签存储图书信息', install_location: '身份识别', theme_color: '#5a67d8' },
  { name: '红外对射传感器', description: '安装在门闸两侧，检测通道是否被遮挡以判断非法闯入', install_location: '身份识别', theme_color: '#3182ce' },
  { name: '继电器', description: '安装在门闸控制箱内，控制闸机通断', install_location: '身份识别', theme_color: '#dd6b20' },
  { name: 'LED灯', description: '安装在门闸上方，绿色表示通行，红色表示报警', install_location: '身份识别', theme_color: '#d69e2e' },
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
  { name: '雾化器', description: '安装在绿植旁，由智能插座控制通断实现加湿浇水', install_location: '绿色植物', theme_color: '#38a169' },
  { name: '加热棒', description: '安装在水箱内，水温偏低时自动加热', install_location: '绿色植物', theme_color: '#dd6b20' },
  { name: '水箱', description: '绿植区供水容器，配合液位传感器使用', install_location: '绿色植物', theme_color: '#0ea5e9' },
  { name: '智能插座', description: '绿植区执行器电源控制，由ADAM-4150输出信号控制通断', install_location: '绿色植物', theme_color: '#dd6b20' },
  { name: 'ZigBee协调器', description: '绿植区ZigBee网关，汇聚并转发传感器数据', install_location: '绿色植物', theme_color: '#38a169' },
  { name: 'ZigBee四输入量采集器', description: '绿植区采集土壤水分、液位、水温等传感器信号', install_location: '绿色植物', theme_color: '#38a169' },

  // 自助系统
  { name: '电子扫描枪', description: '放置在自助借还台，辅助扫描图书条码', install_location: '自助系统', theme_color: '#d53f8c' },
  { name: '小票打印机', description: '放置在自助借还台，借还成功后自动打印小票凭证', install_location: '自助系统', theme_color: '#d53f8c' },

  // 基础设施（多区域共用）
  { name: 'ADAM-4150数字量采集器', description: '安装在设备间操作箱内，采集数字传感器信号并输出控制信号，覆盖大门、身份识别、大厅安防、绿植区', install_location: '设备间', theme_color: '#4a5568' },
  { name: 'ADAM-4017模拟量采集器', description: '安装在设备间操作箱内，采集温湿度、CO₂、空气质量等模拟传感器信号', install_location: '设备间', theme_color: '#4a5568' },
]
