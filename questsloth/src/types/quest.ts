export interface QuestQuestion {
  question: string
  options: [string, string, string, string]
  correctAnswerIndex: number
  explanation: string
}

export interface QuestPack {
  questTitle: string
  bossName: string
  questions: QuestQuestion[]
}

export const MAX_NOTES_CHARS = 2800
export const STARTING_HP = 100
export const DAMAGE_PER_HIT = 20
export const QUESTIONS_PER_QUEST = 5
