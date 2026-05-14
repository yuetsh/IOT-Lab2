import { Database } from 'bun:sqlite'
import { mkdirSync } from 'fs'

export const dbPath = process.env.DATABASE_PATH ?? 'data.sqlite'
export const db = new Database(dbPath, { create: true })

const uploadsDir = process.env.UPLOADS_PATH ?? 'uploads'
mkdirSync(`${uploadsDir}/stickers`, { recursive: true })

export function reinitSchema() {
  db.query('PRAGMA foreign_keys = ON').run()

  db.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run()

  db.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      area TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run()

  db.query(`
    CREATE TABLE IF NOT EXISTS flowcharts (
      group_id INTEGER PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
      mermaid_code TEXT NOT NULL,
      area TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run()

  db.query(`
    CREATE TABLE IF NOT EXISTS flowchart_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      mermaid_code TEXT NOT NULL,
      area TEXT,
      user_prompt TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run()

  db.query(`
    CREATE TABLE IF NOT EXISTS check_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      flowchart_history_id INTEGER REFERENCES flowchart_history(id) ON DELETE SET NULL,
      area TEXT NOT NULL,
      results_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run()

  db.query(`
    CREATE TABLE IF NOT EXISTS stickers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      install_location TEXT NOT NULL DEFAULT '',
      theme_color TEXT NOT NULL DEFAULT '#4299e1',
      filename TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run()

  db.query(`
    CREATE TABLE IF NOT EXISTS journal_placements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      area TEXT,
      sticker_id INTEGER NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
      node_id TEXT,
      node_label TEXT,
      x REAL NOT NULL,
      y REAL NOT NULL,
      scale REAL NOT NULL DEFAULT 1.0
    )
  `).run()

  db.query(`
    CREATE TABLE IF NOT EXISTS device_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      area TEXT,
      placements_json TEXT NOT NULL,
      mermaid_code TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run()

  db.query(`
    CREATE TABLE IF NOT EXISTS device_check_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      submission_id INTEGER NOT NULL REFERENCES device_submissions(id) ON DELETE CASCADE,
      area TEXT,
      results_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run()
}

reinitSchema()
