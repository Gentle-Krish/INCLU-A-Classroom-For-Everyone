import type { QuestPack } from '../types/quest'

type QuestPreviewProps = {
  quest: QuestPack
}

export function QuestPreview({ quest }: QuestPreviewProps) {
  return (
    <div className="panel space-y-4 p-5">
      <div>
        <p className="font-display text-[10px] text-[var(--color-ember)]">Quest ready</p>
        <h2 className="mt-2 text-xl font-bold">{quest.questTitle}</h2>
        <p className="mt-1 text-sm text-[color-mix(in_srgb,var(--color-parchment)_70%,transparent)]">
          Boss: <span className="text-[var(--color-parchment)]">{quest.bossName}</span>
        </p>
      </div>
      <ol className="space-y-3">
        {quest.questions.map((q, i) => (
          <li
            key={i}
            className="border border-[var(--color-panel-edge)] bg-[color-mix(in_srgb,#0d0b09_40%,transparent)] p-3"
          >
            <p className="text-sm font-medium">
              <span className="mr-2 text-[var(--color-ember)]">Q{i + 1}.</span>
              {q.question}
            </p>
            <ul className="mt-2 grid gap-1 text-xs text-[color-mix(in_srgb,var(--color-parchment)_75%,transparent)] sm:grid-cols-2">
              {q.options.map((opt, oi) => (
                <li
                  key={oi}
                  className={
                    oi === q.correctAnswerIndex
                      ? 'text-[var(--color-moss-bright)]'
                      : undefined
                  }
                >
                  {String.fromCharCode(65 + oi)}. {opt}
                  {oi === q.correctAnswerIndex ? ' ✓' : ''}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
