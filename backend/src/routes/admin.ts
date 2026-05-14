import { Elysia } from 'elysia'
import { db } from '../db'
import { clearAll, runSeed } from '../seed'
import { runMockData } from '../mockData'

type CheckResult = { passed: boolean; comment: string }
type CheckRun = { created_at: string; results: CheckResult[] }
type HistoryEntry = { id: number; mermaid_code: string; created_at: string; user_prompt: string | null; check_runs: CheckRun[] }
type GroupFull = { id: number; name: string; areas: Record<string, HistoryEntry[]>; device_submissions_count: number }

export const adminRouter = new Elysia()
  .get('/api/admin/overview', () => {
    const groups = db.query('SELECT * FROM groups ORDER BY name').all() as { id: number; name: string }[]
    return groups.map(g => {
      const flowchart = db.query(
        'SELECT mermaid_code, area, updated_at FROM flowcharts WHERE group_id = ?'
      ).get(g.id)
      const placements = db.query(`
        SELECT jp.id, jp.sticker_id, jp.node_id, jp.node_label, jp.x, jp.y, jp.scale,
               s.name as sticker_name, s.filename as sticker_filename
        FROM journal_placements jp
        JOIN stickers s ON s.id = jp.sticker_id
        WHERE jp.group_id = ?
          AND jp.node_id IS NOT NULL
      `).all(g.id)
      const messageCount = (db.query(
        'SELECT COUNT(*) as cnt FROM messages WHERE group_id = ?'
      ).get(g.id) as { cnt: number }).cnt
      return { ...g, flowchart: flowchart ?? null, placements, messageCount }
    })
  })
  .get('/api/admin/full', () => {
    const groups = db.query('SELECT id, name FROM groups ORDER BY name').all() as { id: number; name: string }[]
    const result: GroupFull[] = []

    for (const g of groups) {
      const histories = db.query(
        'SELECT id, mermaid_code, area, user_prompt, created_at FROM flowchart_history WHERE group_id = ? ORDER BY created_at ASC'
      ).all(g.id) as { id: number; mermaid_code: string; area: string | null; user_prompt: string | null; created_at: string }[]

      const checkRows = db.query(
        'SELECT flowchart_history_id, results_json, created_at FROM check_results WHERE group_id = ? ORDER BY created_at ASC'
      ).all(g.id) as { flowchart_history_id: number | null; results_json: string; created_at: string }[]

      const checkMap = new Map<number, CheckRun[]>()
      for (const c of checkRows) {
        if (c.flowchart_history_id != null) {
          if (!checkMap.has(c.flowchart_history_id)) checkMap.set(c.flowchart_history_id, [])
          checkMap.get(c.flowchart_history_id)!.push({ created_at: c.created_at, results: JSON.parse(c.results_json) })
        }
      }

      const areas: Record<string, HistoryEntry[]> = {}
      for (const h of histories) {
        const area = h.area ?? '未知区域'
        if (!areas[area]) areas[area] = []
        areas[area].push({
          id: h.id,
          mermaid_code: h.mermaid_code,
          created_at: h.created_at,
          user_prompt: h.user_prompt,
          check_runs: checkMap.get(h.id) ?? [],
        })
      }

      const device_submissions_count = (db.query(
        'SELECT COUNT(*) as cnt FROM device_submissions WHERE group_id = ?'
      ).get(g.id) as { cnt: number }).cnt

      result.push({ id: g.id, name: g.name, areas, device_submissions_count })
    }

    return result
  })
  .get('/api/admin/device-placements', () => {
    const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统']
    const groups = db.query('SELECT id, name FROM groups ORDER BY name').all() as { id: number; name: string }[]
    type Placement = { sticker_id: number; node_id: string; node_label: string; sticker_name: string; sticker_filename: string }
    type CheckResultItem = { device_name: string; node_label: string; passed: boolean; comment: string }
    type CheckResult = { passed_count: number; total_count: number; results: CheckResultItem[]; created_at: string }
    type AreaData = { mermaid_code: string | null; placements: Placement[]; submission_created_at: string | null; check_result: CheckResult | null; check_results: CheckResult[]; check_count: number }

    const result = []
    for (const g of groups) {
      // 每个区域最新的流程图（fallback 用）
      const latestFlowchart: Record<string, string> = {}
      for (const area of AREAS) {
        const fh = db.query(
          'SELECT mermaid_code FROM flowchart_history WHERE group_id = ? AND area = ? ORDER BY created_at DESC LIMIT 1'
        ).get(g.id, area) as { mermaid_code: string } | null
        if (fh) latestFlowchart[area] = fh.mermaid_code
      }

      // 建立 mermaid_code → area 映射
      const allHistory = db.query(
        'SELECT mermaid_code, area FROM flowchart_history WHERE group_id = ? AND area IS NOT NULL'
      ).all(g.id) as { mermaid_code: string; area: string }[]
      const codeToArea = new Map<string, string>()
      for (const fh of allHistory) codeToArea.set(fh.mermaid_code, fh.area)

      // 所有提交，从新到旧，每个区域只取最新一次
      const submissions = db.query(
        'SELECT id, area, placements_json, created_at, mermaid_code FROM device_submissions WHERE group_id = ? ORDER BY created_at DESC'
      ).all(g.id) as { id: number; area: string | null; placements_json: string; created_at: string; mermaid_code: string | null }[]

      const areaResult: Record<string, AreaData> = {}
      for (const sub of submissions) {
        if (!sub.mermaid_code) continue
        const area = sub.area ?? codeToArea.get(sub.mermaid_code)
        if (!area || areaResult[area]) continue

        // 聚合该组该区域同一流程图所有 submissions 的检测记录
        const checkRows = db.query(`
          SELECT dcr.results_json, dcr.created_at
          FROM device_check_results dcr
          JOIN device_submissions ds ON dcr.submission_id = ds.id
          WHERE ds.group_id = ? AND ds.mermaid_code = ?
          ORDER BY dcr.created_at DESC
        `).all(g.id, sub.mermaid_code) as { results_json: string; created_at: string }[]

        const check_results: CheckResult[] = checkRows.map(row => {
          const results = JSON.parse(row.results_json) as CheckResultItem[]
          return { passed_count: results.filter(r => r.passed).length, total_count: results.length, results, created_at: row.created_at }
        })

        areaResult[area] = {
          mermaid_code: sub.mermaid_code,
          placements: JSON.parse(sub.placements_json) as Placement[],
          submission_created_at: sub.created_at,
          check_result: check_results[0] ?? null,
          check_results,
          check_count: check_results.length,
        }
      }

      // 没有提交的区域：用最新流程图填充，放置列表为空
      for (const area of AREAS) {
        if (!areaResult[area]) {
          areaResult[area] = {
            mermaid_code: latestFlowchart[area] ?? null,
            placements: [],
            submission_created_at: null,
            check_result: null,
            check_results: [],
            check_count: 0,
          }
        }
      }

      result.push({ group_id: g.id, group_name: g.name, areas: areaResult })
    }
    return result
  })
  .get('/api/admin/summary', () => {
    const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统']
    const groups = db.query('SELECT id, name, created_at FROM groups ORDER BY name').all() as { id: number; name: string; created_at: string }[]

    const groupSummaries = groups.map(g => {
      const messageCount = (db.query(
        'SELECT COUNT(*) as cnt FROM messages WHERE group_id = ?'
      ).get(g.id) as { cnt: number }).cnt

      const userMessageCount = (db.query(
        "SELECT COUNT(*) as cnt FROM messages WHERE group_id = ? AND role = 'user'"
      ).get(g.id) as { cnt: number }).cnt

      const areaSummaries: Record<string, {
        flowchart_count: number
        latest_check_passed: number
        latest_check_total: number
        has_device_submission: boolean
        device_check_passed: number
        device_check_total: number
      }> = {}

      for (const area of AREAS) {
        const flowchartCount = (db.query(
          'SELECT COUNT(*) as cnt FROM flowchart_history WHERE group_id = ? AND area = ?'
        ).get(g.id, area) as { cnt: number }).cnt

        const latestHistory = db.query(
          'SELECT id FROM flowchart_history WHERE group_id = ? AND area = ? ORDER BY created_at DESC LIMIT 1'
        ).get(g.id, area) as { id: number } | null

        let latestCheckPassed = 0
        let latestCheckTotal = 0
        if (latestHistory) {
          const checkRow = db.query(
            'SELECT results_json FROM check_results WHERE group_id = ? AND flowchart_history_id = ? ORDER BY created_at DESC LIMIT 1'
          ).get(g.id, latestHistory.id) as { results_json: string } | null
          if (checkRow) {
            const results = JSON.parse(checkRow.results_json) as { passed: boolean }[]
            latestCheckTotal = results.length
            latestCheckPassed = results.filter(r => r.passed).length
          }
        }

        const deviceSub = db.query(
          'SELECT id FROM device_submissions WHERE group_id = ? AND area = ? ORDER BY created_at DESC LIMIT 1'
        ).get(g.id, area) as { id: number } | null

        let deviceCheckPassed = 0
        let deviceCheckTotal = 0
        if (deviceSub) {
          const dcRow = db.query(
            'SELECT results_json FROM device_check_results WHERE submission_id = ? ORDER BY created_at DESC LIMIT 1'
          ).get(deviceSub.id) as { results_json: string } | null
          if (dcRow) {
            const results = JSON.parse(dcRow.results_json) as { passed: boolean }[]
            deviceCheckTotal = results.length
            deviceCheckPassed = results.filter(r => r.passed).length
          }
        }

        areaSummaries[area] = {
          flowchart_count: flowchartCount,
          latest_check_passed: latestCheckPassed,
          latest_check_total: latestCheckTotal,
          has_device_submission: !!deviceSub,
          device_check_passed: deviceCheckPassed,
          device_check_total: deviceCheckTotal,
        }
      }

      const totalFlowcharts = AREAS.reduce((s, a) => s + areaSummaries[a].flowchart_count, 0)
      const completedAreas = AREAS.filter(a => areaSummaries[a].flowchart_count > 0).length
      const deviceCompletedAreas = AREAS.filter(a => areaSummaries[a].has_device_submission).length

      return {
        id: g.id,
        name: g.name,
        created_at: g.created_at,
        message_count: messageCount,
        user_message_count: userMessageCount,
        total_flowcharts: totalFlowcharts,
        completed_areas: completedAreas,
        device_completed_areas: deviceCompletedAreas,
        areas: areaSummaries,
      }
    })

    const totalGroups = groups.length
    const avgMessages = totalGroups > 0 ? Math.round(groupSummaries.reduce((s, g) => s + g.message_count, 0) / totalGroups) : 0
    const avgFlowcharts = totalGroups > 0 ? Math.round(groupSummaries.reduce((s, g) => s + g.total_flowcharts, 0) / totalGroups * 10) / 10 : 0
    const allAreasComplete = groupSummaries.filter(g => g.completed_areas === 6).length
    const allDeviceComplete = groupSummaries.filter(g => g.device_completed_areas === 6).length

    return {
      overview: {
        total_groups: totalGroups,
        avg_messages: avgMessages,
        avg_flowcharts: avgFlowcharts,
        all_areas_complete: allAreasComplete,
        all_device_complete: allDeviceComplete,
      },
      groups: groupSummaries,
    }
  })
  .get('/api/admin/progress', () => {
    const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统']
    const groups = db.query('SELECT id, name, created_at FROM groups ORDER BY name').all() as { id: number; name: string; created_at: string }[]

    // 1. 各次检测通过率趋势（每组按时间排列的所有检测记录）
    const checkTrend = groups.map(g => {
      const rows = db.query(`
        SELECT cr.results_json, cr.created_at, fh.area
        FROM check_results cr
        JOIN flowchart_history fh ON cr.flowchart_history_id = fh.id
        WHERE cr.group_id = ?
        ORDER BY cr.created_at ASC
      `).all(g.id) as { results_json: string; created_at: string; area: string }[]

      const checks = rows.map((r, i) => {
        const results = JSON.parse(r.results_json) as { passed: boolean }[]
        const passed = results.filter(x => x.passed).length
        return { attempt: i + 1, passed, total: results.length, rate: results.length > 0 ? Math.round(passed / results.length * 100) : 0, area: r.area, created_at: r.created_at }
      })
      return { group_id: g.id, group_name: g.name, checks }
    })

    // 2. 各区域平均修改轮次（生成了多少次流程图才通过检测）
    const revisionRounds = AREAS.map(area => {
      const rows = db.query(`
        SELECT fh.group_id, COUNT(*) as rounds,
               MAX(CASE WHEN cr.id IS NOT NULL THEN 1 ELSE 0 END) as has_check
        FROM flowchart_history fh
        LEFT JOIN check_results cr ON cr.flowchart_history_id = fh.id AND cr.group_id = fh.group_id
        WHERE fh.area = ?
        GROUP BY fh.group_id
      `).all(area) as { group_id: number; rounds: number; has_check: number }[]

      const withCheck = rows.filter(r => r.has_check)
      const avgRounds = withCheck.length > 0
        ? Math.round(withCheck.reduce((s, r) => s + r.rounds, 0) / withCheck.length * 10) / 10
        : 0
      return { area, avg_rounds: avgRounds, groups_count: rows.length }
    })

    // 3. 全局完成排名：所有组所有区域放在一起，按通过检测时间统一排序
    const parseTs = (s: string) => new Date(s.replace(' ', 'T')).getTime()

    const allCompletions: { group_id: number; area: string; ts: number }[] = []
    for (const area of AREAS) {
      const rows = db.query(`
        SELECT cr.group_id, MAX(cr.created_at) as last_passed_at
        FROM check_results cr
        WHERE cr.area = ?
          AND NOT EXISTS (
            SELECT 1 FROM json_each(cr.results_json) WHERE json_extract(value, '$.passed') = 0
          )
        GROUP BY cr.group_id
      `).all(area) as { group_id: number; last_passed_at: string }[]

      for (const r of rows) {
        allCompletions.push({ group_id: r.group_id, area, ts: parseTs(r.last_passed_at) })
      }
    }

    allCompletions.sort((a, b) => a.ts - b.ts)
    const rankMap = new Map(allCompletions.map((c, i) => [`${c.group_id}:${c.area}`, i + 1]))

    const completionTimeline = groups.map(g => {
      const areas: Record<string, number | null> = {}
      for (const area of AREAS) {
        areas[area] = rankMap.get(`${g.id}:${area}`) ?? null
      }
      return { group_id: g.id, group_name: g.name, areas }
    })

    return { checkTrend, revisionRounds, completionTimeline }
  })
  .post('/api/admin/clear', () => {
    clearAll()
    return { ok: true }
  })
  .post('/api/admin/reset', () => {
    runSeed()
    return { ok: true }
  })
  .post('/api/admin/mock', () => {
    runMockData()
    return { ok: true }
  })
