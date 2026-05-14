# 生成模拟数据 — 设计文档

## 概述

在"网站设置"页面新增独立的"生成模拟数据"操作，填充完整的模拟交互数据，使 AdminOverview、AdminDataView、AdminDevicePlacements、AdminSummary 等所有数据展示页面呈现真实的使用痕迹。该操作不清空数据，需要在已有种子数据（groups + stickers）的基础上追加。

---

## 数据模型与生成策略

### 覆盖范围

6 个小组 × 6 个区域，全部生成完整数据。

### 各表生成内容

**flowchart_history**（每组每区域 2-3 轮）
- 第 1 轮：基于参考流程图的"草稿版"（略有不完整，如缺少某个判断分支）
- 第 2 轮（可选）：中间修订版
- 最终轮：与 `AREA_REFERENCE_FLOWCHARTS` 完全一致的正确版本
- `created_at` 模拟时间间隔（每轮间隔 10-30 分钟）

**check_results**（关联 flowchart_history）
- 第 1 轮：3-4 项通过 / 1-2 项未通过（有 comment 说明问题）
- 最终轮：全部通过
- `results_json` 格式：`[{ passed: boolean, comment: string }]`

**flowcharts**（当前流程图状态）
- 每组每区域取最终轮 mermaid_code 插入（upsert）

**messages**（每组每区域 4-6 条）
- role 交替为 `user` / `assistant`
- user 消息：与区域相关的提问（如"大门区域的流程图应该包含哪些节点？"）
- assistant 消息：对应的引导回答
- `area` 字段填对应区域名

**device_submissions**（每组每区域 1 条）
- `placements_json` 基于 `AREA_DEVICE_NODE_MAPPINGS` 生成：设备名 → 对应 node_label，附 x/y 坐标（从节点位置映射得到伪随机值）
- `mermaid_code` 指向最终轮流程图
- `area` 填对应区域名

**device_check_results**（关联 device_submissions，每条 1 个结果）
- 大部分组全部通过（5/6），1-2 个组有 1 项未通过（体现真实差异）
- `results_json` 格式：`[{ device_name, node_label, passed, comment }]`

**journal_placements**（每组每区域，按设备数量生成）
- 基于 `AREA_DEVICE_NODE_MAPPINGS` 中每个节点的设备列表
- `sticker_id` 通过 sticker name 匹配数据库中已有贴纸
- `node_id` / `node_label` 填映射中的节点名
- x/y 坐标：基于节点索引生成合理的伪随机布局值

---

## 架构

### 后端

新文件 `backend/src/mockData.ts`：
- 导出 `runMockData()` 函数
- 依赖 `db`、`AREA_REFERENCE_FLOWCHARTS`、`AREA_DEVICE_NODE_MAPPINGS`
- 不调用 `clearAll()`，只追加数据

新路由（在 `backend/src/routes/admin.ts` 追加）：
```
POST /api/admin/mock  →  runMockData()  →  { ok: true }
```

### 前端

`frontend/src/pages/admin/AdminSettings.tsx` 新增一个 `ActionCard`：
- title: "生成模拟数据"
- description: "在种子数据基础上生成完整的模拟交互记录（需先加载种子数据）"
- buttonColor: "#0d9488"（青绿色，与其他按钮区分）
- onConfirm: `POST /api/admin/mock`

---

## 错误处理

- `runMockData()` 若 groups 表为空则抛出错误（提示需先加载种子数据）
- 前端通过现有 ActionCard 的 error 状态展示失败提示

---

## 时间戳策略

所有模拟数据的 `created_at` 基于当前时间往前推算：
- 最早记录：当前时间 - 3 小时
- 每轮间隔 15 分钟，每组间隔 5 分钟（避免完全一致）
- 保证数据时序合理，图表展示有意义
