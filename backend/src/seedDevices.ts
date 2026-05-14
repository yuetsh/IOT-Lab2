export type SeedDevice = {
  name: string
  description: string
  install_location: string
  theme_color: string
}

export const seedDevices: SeedDevice[] = [
  { name: '人体红外传感器', description: '图书馆大门处', install_location: '大门区域', theme_color: '#3182ce' },
  { name: '超高频中距离一体机', description: '安装在大门检测口的位置', install_location: '大门检测口区域', theme_color: '#5a67d8' },
  { name: '高清网络摄像机', description: '安装在高处视线范围最大的地方', install_location: '顶棚', theme_color: '#0f766e' },
  { name: '红外对射传感器', description: '安装在门闸的两侧', install_location: '门闸区域的两侧', theme_color: '#3182ce' },
  { name: 'LED灯', description: '安装在门闸处上方', install_location: '门闸区域', theme_color: '#d69e2e' },
  { name: '报警灯', description: '安装在门闸处上方', install_location: '门闸区域', theme_color: '#e53e3e' },
  { name: '继电器', description: '安装在门闸处上方', install_location: '门闸区域', theme_color: '#dd6b20' },
  { name: '火焰传感器', description: '尽量安装在四周空旷或射面上没有任何障碍物的地方', install_location: '顶棚', theme_color: '#e53e3e' },
  { name: '烟雾传感器', description: '尽量安装在四周空旷或射面上没有任何障碍物的地方', install_location: '顶棚', theme_color: '#e53e3e' },
  { name: 'LED显示器', description: '大堂区域墙面的高处', install_location: '大堂区', theme_color: '#805ad5' },
  { name: '温湿度传感器', description: '尽量安装在四周空旷或射面上没有任何障碍物的地方', install_location: '大堂区域墙面靠上的位置', theme_color: '#0ea5e9' },
  { name: '空气质量传感器', description: '尽量安装在四周空旷或射面上没有任何障碍物的地方', install_location: '大堂区域墙面靠上的位置', theme_color: '#0ea5e9' },
  { name: '二氧化碳传感器', description: '尽量安装在四周空旷或射面上没有任何障碍物的地方', install_location: '大堂区域墙面靠上的位置', theme_color: '#0ea5e9' },
  { name: 'ZigBee四输入量采集器', description: '大厅绿色植物区', install_location: '绿色植物区', theme_color: '#38a169' },
  { name: '智能插座', description: '大厅绿色植物区', install_location: '绿色植物区', theme_color: '#dd6b20' },
  { name: '土壤水分传感器', description: '大厅绿色植物区', install_location: '桌面工位上', theme_color: '#38a169' },
  { name: '水箱', description: '大厅绿色植物区', install_location: '桌面工位上', theme_color: '#0ea5e9' },
  { name: '雾化器', description: '大厅绿色植物区', install_location: '桌面工位上', theme_color: '#38a169' },
  { name: '水温传感器', description: '大厅绿色植物区', install_location: '桌面工位上', theme_color: '#0ea5e9' },
  { name: '加热棒', description: '大厅绿色植物区', install_location: '桌面工位上', theme_color: '#dd6b20' },
  { name: '液位传感器', description: '大厅绿色植物区', install_location: '桌面工位上', theme_color: '#0ea5e9' },
  { name: '智能插座', description: '大厅绿色植物区', install_location: '桌面工位上', theme_color: '#dd6b20' },
  { name: '条码扫描枪', description: '放置在自助区的位置', install_location: '桌面工位上', theme_color: '#d53f8c' },
  { name: '小票打印机', description: '放置在自助区的位置', install_location: '桌面工位上', theme_color: '#d53f8c' },
  { name: '数字量采集器', description: '安装在防雨、电磁干扰小的密闭空间内', install_location: '网络中心设备间内或操作箱内', theme_color: '#4a5568' },
  { name: '模拟量采集器', description: '安装在防雨、电磁干扰小的密闭空间内', install_location: '网络中心设备间内或操作箱内', theme_color: '#4a5568' },
  { name: '路由器', description: '安装在防雨、电磁干扰小的密闭空间内', install_location: '网络中心设备间内或操作箱内', theme_color: '#4a5568' },
  { name: '串口服务器', description: '安装在防雨、电磁干扰小的密闭空间内', install_location: '网络中心设备间内或操作箱内', theme_color: '#4a5568' },
  { name: '移动互联终端', description: '放置在自助区的位置', install_location: '桌面上', theme_color: '#d53f8c' },
]
