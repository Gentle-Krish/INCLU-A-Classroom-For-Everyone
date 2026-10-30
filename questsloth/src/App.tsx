import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Dungeon } from './pages/Dungeon'

const Forge = lazy(() =>
  import('./pages/Forge').then((m) => ({ default: m.Forge })),
)

function ForgeFallback() {
  return (
    <div className="panel p-8 text-center text-sm text-[color-mix(in_srgb,var(--color-parchment)_70%,transparent)]">
      Loading Teacher Forge…
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route
            path="forge"
            element={
              <Suspense fallback={<ForgeFallback />}>
                <Forge />
              </Suspense>
            }
          />
          <Route path="dungeon" element={<Dungeon />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
