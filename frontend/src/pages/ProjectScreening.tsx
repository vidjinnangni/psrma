import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  api,
  type RecordItem,
  type ScreeningHistoryItem,
  type ScreeningProgress,
  type ScreeningStage,
} from '../lib/api'

const STAGE_FROM_SLUG: Record<string, ScreeningStage> = {
  'title-abstract': 'title_abstract',
  'full-text': 'full_text',
}

const STAGE_LABEL: Record<ScreeningStage, string> = {
  title_abstract: 'Titre / résumé',
  full_text: 'Texte intégral',
}

const EXCLUSION_REASONS = [
  'Hors sujet',
  "Mauvais design d'étude",
  'Population non pertinente',
  'Langue non prise en charge',
  'Doublon',
  'Autre',
]

export default function ProjectScreening() {
  const { id, stage: stageSlug } = useParams<{ id: string; stage: string }>()
  const projectId = Number(id)
  const stage = STAGE_FROM_SLUG[stageSlug ?? ''] ?? 'title_abstract'

  const [current, setCurrent] = useState<RecordItem | null>(null)
  const [progress, setProgress] = useState<ScreeningProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [pendingExclude, setPendingExclude] = useState(false)
  const [reasonDraft, setReasonDraft] = useState('')

  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<ScreeningHistoryItem[]>([])

  const loadNext = useCallback(async () => {
    const items = await api.getScreeningQueue(projectId, stage, 1)
    setCurrent(items[0] ?? null)
  }, [projectId, stage])

  const loadProgress = useCallback(async () => {
    setProgress(await api.getScreeningProgress(projectId, stage))
  }, [projectId, stage])

  const loadHistory = useCallback(async () => {
    setHistory(await api.getScreeningHistory(projectId, stage))
  }, [projectId, stage])

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setHistoryOpen(false)
    Promise.all([loadNext(), loadProgress()]).finally(() => setLoading(false))
  }, [projectId, stage, loadNext, loadProgress])

  const cancelExclude = () => {
    setPendingExclude(false)
    setReasonDraft('')
  }

  const decide = useCallback(
    async (decision: 'include' | 'exclude' | 'maybe', reason?: string) => {
      if (!current || submitting) return
      setSubmitting(true)
      try {
        await api.setScreeningDecision(projectId, current.id, { stage, decision, reason })
        cancelExclude()
        await Promise.all([loadNext(), loadProgress()])
        if (historyOpen) await loadHistory()
      } finally {
        setSubmitting(false)
      }
    },
    [current, submitting, projectId, stage, loadNext, loadProgress, loadHistory, historyOpen],
  )

  const handleUndo = async (item: ScreeningHistoryItem) => {
    await api.deleteScreeningDecision(projectId, item.record.id, stage)
    await Promise.all([loadNext(), loadProgress(), loadHistory()])
  }

  const toggleHistory = async () => {
    if (!historyOpen) await loadHistory()
    setHistoryOpen((v) => !v)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName)

      if (pendingExclude) {
        if (e.key === 'Escape') cancelExclude()
        return
      }
      if (isTyping) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        decide('include')
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'm') {
        e.preventDefault()
        decide('maybe')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPendingExclude(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pendingExclude, decide])

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <Link to={`/projects/${projectId}`} className="text-sm text-accent hover:underline">
        ← Retour au projet
      </Link>

      <header className="mt-4 mb-8">
        <div className="flex items-center gap-2">
          {(['title_abstract', 'full_text'] as ScreeningStage[]).map((s, i) => (
            <Link
              key={s}
              to={`/projects/${projectId}/screening/${s === 'title_abstract' ? 'title-abstract' : 'full-text'}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                stage === s
                  ? 'border-accent bg-accent text-white'
                  : 'border-line text-muted hover:border-accent hover:text-ink'
              }`}
            >
              {i + 1}. {STAGE_LABEL[s]}
            </Link>
          ))}
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Criblage — {STAGE_LABEL[stage]}
        </h1>

        {progress && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full bg-accent transition-all"
                style={{
                  width: `${progress.total ? (progress.screened / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm text-muted">
              {progress.screened} / {progress.total} criblés · {progress.included} inclus ·{' '}
              {progress.excluded} exclus · {progress.maybe} incertains
            </p>
          </div>
        )}
      </header>

      {loading && <p className="text-muted">Chargement…</p>}

      {!loading && !current && progress?.total === 0 && (
        <div className="rounded-xl border border-line p-8 text-center">
          <p className="text-lg font-medium text-ink">Rien à cribler pour l'instant</p>
          <p className="mt-1 text-sm text-muted">
            {stage === 'full_text'
              ? "Aucun record n'a encore été inclus au stade titre / résumé."
              : "Aucun record importé pour ce projet."}
          </p>
        </div>
      )}

      {!loading && !current && progress && progress.total > 0 && (
        <div className="rounded-xl border border-line p-8 text-center">
          <p className="text-lg font-medium text-ink">Criblage terminé</p>
          <p className="mt-1 text-sm text-muted">
            Tous les records ont été criblés pour cette étape.
          </p>
        </div>
      )}

      {current && (
        <div className="rounded-xl border border-line p-6">
          <p className="text-lg font-medium text-ink">{current.title ?? 'Sans titre'}</p>
          <p className="mt-1 text-xs text-muted">
            {current.authors?.slice(0, 4).join(', ')}
            {current.authors && current.authors.length > 4 ? ' et al.' : ''}
            {current.venue ? ` · ${current.venue}` : ''}
            {current.publication_year ? ` · ${current.publication_year}` : ''}
          </p>

          {stage === 'full_text' && current.doi && /^https?:\/\//i.test(current.doi) && (
            <a
              href={current.doi}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-accent hover:underline"
            >
              Ouvrir le texte intégral ↗
            </a>
          )}

          {current.abstract && (
            <p className="mt-4 max-h-80 overflow-y-auto text-sm leading-relaxed text-ink">
              {current.abstract}
            </p>
          )}

          {!pendingExclude && (
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingExclude(true)}
                disabled={submitting}
                className="flex-1 rounded-lg border border-line px-4 py-2.5 font-medium text-ink transition hover:border-red-400 hover:text-red-500 disabled:opacity-50"
              >
                Exclure <span className="text-muted">←</span>
              </button>
              <button
                type="button"
                onClick={() => decide('maybe')}
                disabled={submitting}
                className="flex-1 rounded-lg border border-line px-4 py-2.5 font-medium text-ink transition hover:border-accent disabled:opacity-50"
              >
                Peut-être <span className="text-muted">↓ / M</span>
              </button>
              <button
                type="button"
                onClick={() => decide('include')}
                disabled={submitting}
                className="flex-1 rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Inclure <span className="opacity-80">→</span>
              </button>
            </div>
          )}

          {pendingExclude && (
            <div className="mt-6 rounded-lg border border-line p-4">
              <p className="mb-3 text-sm font-medium text-ink">Motif d'exclusion</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {EXCLUSION_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReasonDraft(r)}
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      reasonDraft === r
                        ? 'border-red-400 bg-red-50 text-red-600'
                        : 'border-line text-ink hover:border-red-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                placeholder="Préciser le motif (optionnel)"
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={cancelExclude}
                  className="rounded-lg border border-line px-4 py-2 text-sm text-ink"
                >
                  Annuler (Échap)
                </button>
                <button
                  type="button"
                  onClick={() => decide('exclude', reasonDraft || undefined)}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Confirmer l'exclusion
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <section className="mt-10">
        <button type="button" onClick={toggleHistory} className="text-sm text-accent">
          {historyOpen ? 'Masquer' : 'Voir'} l'historique des décisions
        </button>

        {historyOpen && (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {history.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted">Aucune décision pour le moment.</li>
            )}
            {history.map((item) => (
              <li key={item.decision_id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{item.record.title ?? 'Sans titre'}</p>
                  <p className="text-xs text-muted">
                    {item.decision === 'include' && 'Inclus'}
                    {item.decision === 'exclude' && `Exclu${item.reason ? ` · ${item.reason}` : ''}`}
                    {item.decision === 'maybe' && 'Incertain'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUndo(item)}
                  className="shrink-0 text-sm text-accent"
                >
                  Annuler
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
