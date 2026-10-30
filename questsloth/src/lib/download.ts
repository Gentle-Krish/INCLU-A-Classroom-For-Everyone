import type { QuestPack } from '../types/quest'

export function downloadQuestPack(quest: QuestPack, filename = 'quest.json') {
  const blob = new Blob([JSON.stringify(quest, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export async function readQuestFile(file: File) {
  const text = await file.text()
  return text
}
