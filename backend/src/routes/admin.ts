import { Elysia } from 'elysia'
import { db } from '../db'
import { groups, messages, flowcharts, flowchart_history, check_results, stickers, journal_placements, device_submissions, device_check_results } from '../schema'
import { eq, and, isNotNull, desc, asc, count, sql } from 'drizzle-orm'
import { clearAll, runSeed } from '../seed'
import { runMockData } from '../mockData'

type CheckResult = { passed: boolean; comment: string }
type CheckRun = { created_at: string; results: CheckResult[] }
type HistoryEntry = { id: number; mermaid_code: string; created_at: string; user_prompt: string | null; check_runs: CheckRun[] }
type GroupFull = { id: number; name: string; areas: Record<string, HistoryEntry[]>; device_submissions_count: number }
type StatsGroup = { id: number; name: string; created_at: string | null }

const statsGroups = () => db.select({ id: groups.id, name: groups.name, created_at: groups.created_at })
  .from(groups)
  .where(eq(groups.is_stats_excluded, 0))
  .orderBy(asc(groups.name))
  .all() as StatsGroup[]

export const adminRouter = new Elysia()
  .get('/api/admin/overview', () => {
    return statsGroups().map(g => {
      const flowchart = db.select({
        mermaid_code: flowcharts.mermaid_code,
        area: flowcharts.area,
        updated_at: flowcharts.updated_at,
      }).from(flowcharts).where(eq(flowcharts.group_id, g.id)).get() ?? null

      const placements = db.select({
        id: journal_placements.id,
        sticker_id: journal_placements.sticker_id,
        node_id: journal_placements.node_id,
        node_label: journal_placements.node_label,
        x: journal_placements.x,
        y: journal_placements.y,
        scale: journal_placements.scale,
        sticker_name: stickers.name,
        sticker_filename: stickers.filename,
      })
        .from(journal_placements)
        .innerJoin(stickers, eq(stickers.id, journal_placements.sticker_id))
        .where(and(eq(journal_placements.group_id, g.id), isNotNull(journal_placements.node_id)))
        .all()

      const messageCount = db.select({ cnt: count() }).from(messages).where(eq(messages.group_id, g.id)).get()?.cnt ?? 0
      return { ...g, flowchart, placements, messageCount }
    })
  })
  .get('/api/admin/full', () => {
    const groupList = statsGroups()
    const result: GroupFull[] = []

    for (const g of groupList) {
      const histories = db.select({
        id: flowchart_history.id,
        mermaid_code: flowchart_history.mermaid_code,
        area: flowchart_history.area,
        user_prompt: flowchart_history.user_prompt,
        created_at: flowchart_history.created_at,
      })
        .from(flowchart_history)
        .where(eq(flowchart_history.group_id, g.id))
        .orderBy(asc(flowchart_history.created_at))
        .all()

      const checkRows = db.select({
        flowchart_history_id: check_results.flowchart_history_id,
        results_json: check_results.results_json,
        created_at: check_results.created_at,
      })
        .from(check_results)
        .where(eq(check_results.group_id, g.id))
        .orderBy(asc(check_results.created_at))
        .all()

      const checkMap = new Map<number, CheckRun[]>()
      for (const c of checkRows) {
        if (c.flowchart_history_id != null) {
          if (!checkMap.has(c.flowchart_history_id)) checkMap.set(c.flowchart_history_id, [])
          checkMap.get(c.flowchart_history_id)!.push({ created_at: c.created_at!, results: JSON.parse(c.results_json) })
        }
      }

      const areas: Record<string, HistoryEntry[]> = {}
      for (const h of histories) {
        const area = h.area ?? '未知区域'
        if (!areas[area]) areas[area] = []
        areas[area].push({
          id: h.id,
          mermaid_code: h.mermaid_code,
          created_at: h.created_at!,
          user_prompt: h.user_prompt,
          check_runs: checkMap.get(h.id) ?? [],
        })
      }

      const device_submissions_count = db.select({ cnt: count() }).from(device_submissions).where(eq(device_submissions.group_id, g.id)).get()?.cnt ?? 0
      result.push({ id: g.id, name: g.name, areas, device_submissions_count })
    }

    return result
  })
  .get('/api/admin/device-placements', () => {
    const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统']
    const groupList = statsGroups()
    type Placement = { sticker_id: number; node_id: string; node_label: string; sticker_name: string; sticker_filename: string }
    type CheckResultItem = { device_name: string; node_label: string; passed: boolean; comment: string }
    type CheckResultSummary = { passed_count: number; total_count: number; results: CheckResultItem[]; created_at: string }
    type AreaData = { mermaid_code: string | null; placements: Placement[]; submission_created_at: string | null; check_result: CheckResultSummary | null; check_results: CheckResultSummary[]; check_count: number }

    const result = []
    for (const g of groupList) {
      const latestFlowchart: Record<string, string> = {}
      for (const area of AREAS) {
        const fh = db.select({ mermaid_code: flowchart_history.mermaid_code })
          .from(flowchart_history)
          .where(and(eq(flowchart_history.group_id, g.id), eq(flowchart_history.area, area)))
          .orderBy(desc(flowchart_history.created_at))
          .limit(1)
          .get() ?? null
        if (fh) latestFlowchart[area] = fh.mermaid_code
      }

      const allHistory = db.select({ mermaid_code: flowchart_history.mermaid_code, area: flowchart_history.area })
        .from(flowchart_history)
        .where(and(eq(flowchart_history.group_id, g.id), isNotNull(flowchart_history.area)))
        .all() as { mermaid_code: string; area: string }[]
      const codeToArea = new Map<string, string>()
      for (const fh of allHistory) codeToArea.set(fh.mermaid_code, fh.area)

      const submissions = db.select({
        id: device_submissions.id,
        area: device_submissions.area,
        placements_json: device_submissions.placements_json,
        created_at: device_submissions.created_at,
        mermaid_code: device_submissions.mermaid_code,
      })
        .from(device_submissions)
        .where(eq(device_submissions.group_id, g.id))
        .orderBy(desc(device_submissions.created_at))
        .all()

      const areaResult: Record<string, AreaData> = {}
      for (const sub of submissions) {
        if (!sub.mermaid_code) continue
        const area = sub.area ?? codeToArea.get(sub.mermaid_code)
        if (!area || areaResult[area]) continue

        const checkRows = db.select({
          results_json: device_check_results.results_json,
          created_at: device_check_results.created_at,
        })
          .from(device_check_results)
          .innerJoin(device_submissions, eq(device_check_results.submission_id, device_submissions.id))
          .where(and(eq(device_submissions.group_id, g.id), eq(device_submissions.mermaid_code, sub.mermaid_code)))
          .orderBy(desc(device_check_results.created_at))
          .all()

        const check_result_list: CheckResultSummary[] = checkRows.map(row => {
          const results = JSON.parse(row.results_json) as CheckResultItem[]
          return { passed_count: results.filter(r => r.passed).length, total_count: results.length, results, created_at: row.created_at! }
        })

        areaResult[area] = {
          mermaid_code: sub.mermaid_code,
          placements: JSON.parse(sub.placements_json) as Placement[],
          submission_created_at: sub.created_at,
          check_result: check_result_list[0] ?? null,
          check_results: check_result_list,
          check_count: check_result_list.length,
        }
      }

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
    const groupList = statsGroups()

    const groupSummaries = groupList.map(g => {
      const messageCount = db.select({ cnt: count() }).from(messages).where(eq(messages.group_id, g.id)).get()?.cnt ?? 0
      const userMessageCount = db.select({ cnt: count() }).from(messages).where(and(eq(messages.group_id, g.id), eq(messages.role, 'user'))).get()?.cnt ?? 0

      const areaSummaries: Record<string, {
        flowchart_count: number
        latest_check_passed: number
        latest_check_total: number
        has_device_submission: boolean
        device_check_passed: number
        device_check_total: number
        device_check_all_passed: boolean
      }> = {}

      for (const area of AREAS) {
        const flowchartCount = db.select({ cnt: count() })
          .from(flowchart_history)
          .where(and(eq(flowchart_history.group_id, g.id), eq(flowchart_history.area, area)))
          .get()?.cnt ?? 0

        const latestHistory = db.select({ id: flowchart_history.id })
          .from(flowchart_history)
          .where(and(eq(flowchart_history.group_id, g.id), eq(flowchart_history.area, area)))
          .orderBy(desc(flowchart_history.created_at))
          .limit(1)
          .get() ?? null

        let latestCheckPassed = 0
        let latestCheckTotal = 0
        if (latestHistory) {
          const checkRow = db.select({ results_json: check_results.results_json })
            .from(check_results)
            .where(and(eq(check_results.group_id, g.id), eq(check_results.flowchart_history_id, latestHistory.id)))
            .orderBy(desc(check_results.created_at))
            .limit(1)
            .get() ?? null
          if (checkRow) {
            const results = JSON.parse(checkRow.results_json) as { passed: boolean }[]
            latestCheckTotal = results.length
            latestCheckPassed = results.filter(r => r.passed).length
          }
        }

        const deviceSub = db.select({ id: device_submissions.id })
          .from(device_submissions)
          .where(and(eq(device_submissions.group_id, g.id), eq(device_submissions.area, area)))
          .orderBy(desc(device_submissions.created_at))
          .limit(1)
          .get() ?? null

        let deviceCheckPassed = 0
        let deviceCheckTotal = 0
        if (deviceSub) {
          const dcRow = db.select({ results_json: device_check_results.results_json })
            .from(device_check_results)
            .where(eq(device_check_results.submission_id, deviceSub.id))
            .orderBy(desc(device_check_results.created_at))
            .limit(1)
            .get() ?? null
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
          device_check_all_passed: deviceCheckTotal > 0 && deviceCheckPassed === deviceCheckTotal,
        }
      }

      const totalFlowcharts = AREAS.reduce((s, a) => s + areaSummaries[a].flowchart_count, 0)
      const completedAreas = AREAS.filter(a =>
        areaSummaries[a].latest_check_total > 0 &&
        areaSummaries[a].latest_check_passed === areaSummaries[a].latest_check_total
      ).length
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

    const totalGroups = groupList.length
    const avgMessages = totalGroups > 0 ? Math.round(groupSummaries.reduce((s, g) => s + g.user_message_count, 0) / totalGroups) : 0
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
    const groupList = statsGroups()

    const checkTrend = groupList.map(g => {
      const rows = db.select({
        results_json: check_results.results_json,
        created_at: check_results.created_at,
        area: flowchart_history.area,
      })
        .from(check_results)
        .innerJoin(flowchart_history, eq(check_results.flowchart_history_id, flowchart_history.id))
        .where(eq(check_results.group_id, g.id))
        .orderBy(asc(check_results.created_at))
        .all() as { results_json: string; created_at: string; area: string }[]

      const checks = rows.map((r, i) => {
        const results = JSON.parse(r.results_json) as { passed: boolean }[]
        const passed = results.filter(x => x.passed).length
        return { attempt: i + 1, passed, total: results.length, rate: results.length > 0 ? Math.round(passed / results.length * 100) : 0, area: r.area, created_at: r.created_at }
      })
      return { group_id: g.id, group_name: g.name, checks }
    })

    const parseTs = (s: string) => new Date(s.replace(' ', 'T')).getTime()
    const allCompletions: { group_id: number; area: string; ts: number; time: string }[] = []

    for (const area of AREAS) {
      const rows = db.all(sql`
        SELECT cr.group_id, MAX(cr.created_at) as last_passed_at
        FROM check_results cr
        JOIN groups g ON g.id = cr.group_id
        WHERE cr.area = ${area}
          AND g.is_stats_excluded = 0
          AND NOT EXISTS (
            SELECT 1 FROM json_each(cr.results_json) WHERE json_extract(value, '$.passed') = 0
          )
        GROUP BY cr.group_id
      `) as { group_id: number; last_passed_at: string }[]

      for (const r of rows) {
        allCompletions.push({ group_id: r.group_id, area, ts: parseTs(r.last_passed_at), time: r.last_passed_at })
      }
    }

    allCompletions.sort((a, b) => a.ts - b.ts)
    const globalTotal = allCompletions.length

    const completionTimeline = groupList.map(g => ({
      group_id: g.id,
      group_name: g.name,
      areas: Object.fromEntries(AREAS.map(a => [a, null as { rank: number; total: number; time: string } | null])),
    }))

    allCompletions.forEach((c, i) => {
      const group = completionTimeline.find(g => g.group_id === c.group_id)
      if (group) group.areas[c.area] = { rank: i + 1, total: globalTotal, time: c.time }
    })

    return { checkTrend, completionTimeline }
  })
  .post('/api/admin/judge-group', () => {
    db.insert(groups)
      .values({ name: '评委体验', is_stats_excluded: 1 })
      .onConflictDoUpdate({
        target: groups.name,
        set: { is_stats_excluded: 1 },
      })
      .run()

    return db.select({
      id: groups.id,
      name: groups.name,
      is_stats_excluded: groups.is_stats_excluded,
      created_at: groups.created_at,
    }).from(groups).where(eq(groups.name, '评委体验')).get()
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
