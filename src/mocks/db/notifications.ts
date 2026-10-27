import { seedNotifications } from '@/mocks/fixtures/community'
import type { AppNotification, NotificationKind } from '@/types/api'

/**
 * The mock API's alerts (MSG-03). FICTIONAL. The other mocks call `notify` whenever one person acts on
 * something the other is part of, as the server would. In the browser the inbox is kept in storage.
 */

type Stored = AppNotification & { userId: string }

const STORAGE_KEY = 'nextown-mock-notifications'
const persistent = import.meta.env.MODE !== 'test'

let rows: Stored[] = []
let counter = 0

function save() {
  if (!persistent) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    // Storage full or unavailable: changes last until reload
  }
}

function load() {
  rows = seedNotifications()
  if (!persistent) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) rows = JSON.parse(raw) as Stored[]
  } catch {
    // Corrupted entry: start from the seeded inbox
  }
}
load()

const toView = ({ userId: _userId, ...n }: Stored): AppNotification => n

export const notificationsDb = {
  notify(userId: string, kind: NotificationKind, title: string, link: string, body?: string) {
    rows.push({
      id: `n-${Date.now().toString(36)}${(counter++).toString(36)}`,
      userId,
      kind,
      title,
      body,
      link,
      read: false,
      createdAt: new Date().toISOString(),
    })
    save()
  },

  forUser(userId: string): AppNotification[] {
    return rows
      .filter((n) => n.userId === userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(toView)
  },

  unread: (userId: string) => rows.filter((n) => n.userId === userId && !n.read).length,

  markRead(userId: string, id: string) {
    const row = rows.find((n) => n.id === id && n.userId === userId)
    if (row) row.read = true
    save()
    return Boolean(row)
  },

  readAll(userId: string) {
    for (const n of rows) if (n.userId === userId) n.read = true
    save()
  },
}

export const mockNotifications = {
  reset() {
    rows = seedNotifications()
  },
}
