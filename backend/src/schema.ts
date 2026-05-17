import { sqliteTable, integer, text, real, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  is_stats_excluded: integer('is_stats_excluded').notNull().default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
})

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  area: text('area'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
})

export const flowcharts = sqliteTable('flowcharts', {
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  mermaid_code: text('mermaid_code').notNull(),
  area: text('area'),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  primaryKey({ columns: [table.group_id] }),
])

export const flowchart_history = sqliteTable('flowchart_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  mermaid_code: text('mermaid_code').notNull(),
  area: text('area'),
  user_prompt: text('user_prompt'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
})

export const check_results = sqliteTable('check_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  flowchart_history_id: integer('flowchart_history_id').references(() => flowchart_history.id, { onDelete: 'set null' }),
  area: text('area').notNull(),
  results_json: text('results_json').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`),
})

export const stickers = sqliteTable('stickers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  install_location: text('install_location').notNull().default(''),
  theme_color: text('theme_color').notNull().default('#4299e1'),
  filename: text('filename').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`),
})

export const journal_placements = sqliteTable('journal_placements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  area: text('area'),
  sticker_id: integer('sticker_id').notNull().references(() => stickers.id, { onDelete: 'cascade' }),
  node_id: text('node_id'),
  node_label: text('node_label'),
  x: real('x').notNull(),
  y: real('y').notNull(),
  scale: real('scale').notNull().default(1.0),
})

export const device_submissions = sqliteTable('device_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  area: text('area'),
  placements_json: text('placements_json').notNull(),
  mermaid_code: text('mermaid_code'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
})

export const device_check_results = sqliteTable('device_check_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  submission_id: integer('submission_id').notNull().references(() => device_submissions.id, { onDelete: 'cascade' }),
  area: text('area'),
  results_json: text('results_json').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`),
})
