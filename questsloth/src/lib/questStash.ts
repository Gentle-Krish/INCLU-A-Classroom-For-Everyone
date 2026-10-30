import type { QuestPack } from '../types/quest'
import { parseQuestPack } from './questSchema'

const PENDING_KEY = 'questsloth.pendingQuest'
const STASH_KEY = 'questsloth.stash.v1'
const MAX_STASH = 5

export type StashEntry = {
  title: string
  bossName: string
  savedAt: number
  pack: QuestPack
}

export function setPendingQuest(pack: QuestPack) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pack))
  } catch {
    // ignore
  }
  pushStash(pack)
}

export function peekPendingQuest(): QuestPack | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    return parseQuestPack(JSON.parse(raw))
  } catch {
    return null
  }
}

export function consumePendingQuest(): QuestPack | null {
  const pack = peekPendingQuest()
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(PENDING_KEY)
    } catch {
      // ignore
    }
  }
  return pack
}

export function loadStash(): StashEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STASH_KEY)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
      .map((item) => {
        try {
          const obj = item as Record<string, unknown>
          const pack = parseQuestPack(obj.pack)
          return {
            title: String(obj.title ?? pack.questTitle),
            bossName: String(obj.bossName ?? pack.bossName),
            savedAt: Number(obj.savedAt) || Date.now(),
            pack,
          } satisfies StashEntry
        } catch {
          return null
        }
      })
      .filter((e): e is StashEntry => e !== null)
      .slice(0, MAX_STASH)
  } catch {
    return []
  }
}

export function pushStash(pack: QuestPack) {
  if (typeof window === 'undefined') return
  try {
    const prev = loadStash().filter((e) => e.title !== pack.questTitle)
    const next: StashEntry[] = [
      {
        title: pack.questTitle,
        bossName: pack.bossName,
        savedAt: Date.now(),
        pack,
      },
      ...prev,
    ].slice(0, MAX_STASH)
    window.localStorage.setItem(STASH_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}
