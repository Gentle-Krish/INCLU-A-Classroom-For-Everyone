import { Link } from 'react-router-dom'

export function Home() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-[var(--color-moss)] opacity-20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 bottom-10 h-48 w-48 rounded-full bg-[var(--color-ember)] opacity-15 blur-3xl"
      />

      <div className="relative space-y-10">
        <div className="max-w-2xl space-y-6">
          <p className="brand-glow font-display text-[11px] leading-relaxed text-[var(--color-ember)] sm:text-sm">
            QuestSloth
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-[var(--color-parchment)] sm:text-4xl">
            Turn dry lecture notes into a dungeon crawl — without leaving the browser.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-[color-mix(in_srgb,var(--color-parchment)_75%,transparent)] sm:text-lg">
            Teachers paste notes. Local Gemma forges a quest pack. Students fight the
            boss by answering — no cloud API, no chore of writing quizzes by hand.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/forge" className="btn-primary">
              Open Teacher Forge
            </Link>
            <Link to="/dungeon" className="btn-secondary">
              Enter Student Dungeon
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="panel p-5 transition hover:-translate-y-0.5">
            <h2 className="font-display text-[9px] text-[var(--color-moss-bright)]">
              01 Forge
            </h2>
            <p className="mt-3 text-sm leading-relaxed">
              WebLLM runs <strong>Gemma 2 2B</strong> on your GPU. Paste notes, get
              strict JSON: title, boss, five MCQs, answers, explanations. Download the
              pack.
            </p>
          </article>
          <article className="panel p-5 transition hover:-translate-y-0.5">
            <h2 className="font-display text-[9px] text-[var(--color-ember)]">
              02 Dungeon
            </h2>
            <p className="mt-3 text-sm leading-relaxed">
              Upload a quest.json (or play a forged pack). Pick difficulty and a power,
              chain combos, earn XP and achievements. Zero inference — phone-friendly.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
