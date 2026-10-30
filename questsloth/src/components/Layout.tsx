import { Link, NavLink, Outlet } from 'react-router-dom'
import { SoundToggle } from './SoundToggle'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'text-sm tracking-wide transition px-2 py-1 border-b-2',
    isActive
      ? 'border-[var(--color-ember)] text-[var(--color-parchment)]'
      : 'border-transparent text-[color-mix(in_srgb,var(--color-parchment)_70%,transparent)] hover:text-[var(--color-parchment)]',
  ].join(' ')

export function Layout() {
  return (
    <div className="pixel-grid min-h-screen">
      <header className="border-b-3 border-[var(--color-panel-edge)] bg-[color-mix(in_srgb,var(--color-ink)_75%,transparent)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="group flex items-baseline gap-2">
            <span className="font-display text-[10px] leading-none text-[var(--color-ember)] sm:text-xs">
              QuestSloth
            </span>
            <span className="hidden text-xs text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)] sm:inline">
              slow quizzes. steady XP.
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <NavLink to="/forge" className={linkClass}>
              Forge
            </NavLink>
            <NavLink to="/dungeon" className={linkClass}>
              Dungeon
            </NavLink>
            <SoundToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-[color-mix(in_srgb,var(--color-parchment)_45%,transparent)]">
        Runs Gemma 2 in your browser via WebLLM · no paid APIs · notes never leave your device
      </footer>
    </div>
  )
}
