import { Elysia } from 'elysia'
import { db } from '../db'
import { runSeed } from '../seed'

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
    type AreaData = { mermaid_code: string | null; placements: Placement[]; submission_created_at: string | null; check_result: CheckResult | null }

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
        'SELECT id, placements_json, created_at, mermaid_code FROM device_submissions WHERE group_id = ? ORDER BY created_at DESC'
      ).all(g.id) as { id: number; placements_json: string; created_at: string; mermaid_code: string | null }[]

      const areaResult: Record<string, AreaData> = {}
      for (const sub of submissions) {
        if (!sub.mermaid_code) continue
        const area = codeToArea.get(sub.mermaid_code)
        if (!area || areaResult[area]) continue

        const checkRow = db.query(
          'SELECT results_json, created_at FROM device_check_results WHERE submission_id = ? ORDER BY created_at DESC LIMIT 1'
        ).get(sub.id) as { results_json: string; created_at: string } | null

        let check_result: CheckResult | null = null
        if (checkRow) {
          const results = JSON.parse(checkRow.results_json) as CheckResultItem[]
          check_result = {
            passed_count: results.filter(r => r.passed).length,
            total_count: results.length,
            results,
            created_at: checkRow.created_at,
          }
        }

        areaResult[area] = {
          mermaid_code: sub.mermaid_code,
          placements: JSON.parse(sub.placements_json) as Placement[],
          submission_created_at: sub.created_at,
          check_result,
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
          }
        }
      }

      result.push({ group_id: g.id, group_name: g.name, areas: areaResult })
    }
    return result
  })
  .post('/api/admin/clear', () => {
    db.query('DELETE FROM check_results').run()
    db.query('DELETE FROM flowchart_history').run()
    db.query('DELETE FROM flowcharts').run()
    db.query('DELETE FROM journal_placements').run()
    db.query('DELETE FROM device_submissions').run()
    db.query('DELETE FROM messages').run()
    db.query('DELETE FROM groups').run()
    db.query("DELETE FROM sqlite_sequence WHERE name IN ('groups','messages','flowcharts','flowchart_history','check_results','device_submissions')").run()
    return { ok: true }
  })
  .post('/api/admin/reset', () => {
    runSeed()
    return { ok: true }
  })
