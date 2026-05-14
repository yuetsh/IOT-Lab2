import { Elysia } from 'elysia'
import { db } from '../db'
import { runSeed } from '../seed'

type CheckResult = { passed: boolean; comment: string }
type CheckRun = { created_at: string; results: CheckResult[] }
type HistoryEntry = { id: number; mermaid_code: string; created_at: string; check_runs: CheckRun[] }
type GroupFull = { id: number; name: string; areas: Record<string, HistoryEntry[]> }

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
        'SELECT id, mermaid_code, area, created_at FROM flowchart_history WHERE group_id = ? ORDER BY created_at ASC'
      ).all(g.id) as { id: number; mermaid_code: string; area: string | null; created_at: string }[]

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
          check_runs: checkMap.get(h.id) ?? [],
        })
      }

      result.push({ id: g.id, name: g.name, areas })
    }

    return result
  })
  .post('/api/admin/clear', () => {
    db.query('DELETE FROM check_results').run()
    db.query('DELETE FROM flowchart_history').run()
    db.query('DELETE FROM flowcharts').run()
    db.query('DELETE FROM journal_placements').run()
    db.query('DELETE FROM messages').run()
    db.query('DELETE FROM groups').run()
    db.query("DELETE FROM sqlite_sequence WHERE name IN ('groups','messages','flowcharts','flowchart_history','check_results')").run()
    return { ok: true }
  })
  .post('/api/admin/reset', () => {
    runSeed()
    return { ok: true }
  })
