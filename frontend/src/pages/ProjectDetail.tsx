import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type Project, type RecordItem, type SearchQuery } from '../lib/api'

const WORK_TYPES = [
  { value: 'article', label: 'Article' },
  { value: 'review', label: 'Revue' },
  { value: 'preprint', label: 'Preprint' },
  { value: 'book-chapter', label: 'Chapitre de livre' },
  { value: 'dissertation', label: 'Thèse' },
  { value: 'report', label: 'Rapport' },
]

const PAGE_SIZE = 10

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([])

  const [queryString, setQueryString] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [openAccessOnly, setOpenAccessOnly] = useState(false)
  const [maxRecords, setMaxRecords] = useState(200)
  const [queryName, setQueryName] = useState('')

  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [runLoading, setRunLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedSearchQueryId, setSelectedSearchQueryId] = useState<number | undefined>(undefined)
  const [records, setRecords] = useState<{ items: RecordItem[]; total: number } | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!projectId) return
    api.getProject(projectId).then(setProject)
    api.listSearchQueries(projectId).then(setSearchQueries)
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    api
      .listRecords(projectId, { page, page_size: PAGE_SIZE, search_query_id: selectedSearchQueryId })
      .then(setRecords)
  }, [projectId, page, selectedSearchQueryId])

  useEffect(() => {
    const hasActiveImport = searchQueries.some(
      (sq) => sq.status === 'pending' || sq.status === 'running',
    )
    if (!projectId || !hasActiveImport) return
    const interval = setInterval(async () => {
      const [updatedQueries, updatedRecords] = await Promise.all([
        api.listSearchQueries(projectId),
        api.listRecords(projectId, { page, page_size: PAGE_SIZE, search_query_id: selectedSearchQueryId }),
      ])
      setSearchQueries(updatedQueries)
      setRecords(updatedRecords)
    }, 2000)
    return () => clearInterval(interval)
  }, [searchQueries, projectId, page, selectedSearchQueryId])

  const toggleType = (value: string) => {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    )
  }

  const handlePreview = async () => {
    if (!queryString.trim()) return
    setPreviewLoading(true)
    setError(null)
    try {
      const { count } = await api.previewSearch(projectId, {
        q: queryString.trim(),
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        types: selectedTypes.length ? selectedTypes : undefined,
        open_access_only: openAccessOnly || undefined,
      })
      setPreviewCount(count)
    } catch {
      setError("Échec de l'aperçu OpenAlex.")
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleRunSearch = async () => {
    if (!queryString.trim()) return
    setRunLoading(true)
    setError(null)
    try {
      const created = await api.createSearchQuery(projectId, {
        name: queryName.trim() || queryString.trim(),
        query_string: queryString.trim(),
        filters: {
          from_publication_date: fromDate || undefined,
          to_publication_date: toDate || undefined,
          work_types: selectedTypes.length ? selectedTypes : undefined,
          open_access_only: openAccessOnly || undefined,
        },
        max_records: maxRecords,
      })
      setSearchQueries((prev) => [created, ...prev])
      setSelectedSearchQueryId(undefined)
      setPage(1)
      const refreshed = await api.listRecords(projectId, { page: 1, page_size: PAGE_SIZE })
      setRecords(refreshed)
      setQueryName('')
    } catch {
      setError("Échec de l'import OpenAlex. Vérifie ta requête et réessaie.")
    } finally {
      setRunLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!project) return
    const confirmed = window.confirm(
      `Supprimer définitivement "${project.name}" ? Toutes les recherches, décisions de tri, extractions et méta-analyses associées seront perdues. Cette action est irréversible.`,
    )
    if (!confirmed) return
    await api.deleteProject(projectId)
    navigate('/')
  }

  if (!project) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-muted">Chargement…</div>
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-accent hover:underline">
          ← Tous les projets
        </Link>
        <button
          type="button"
          onClick={handleDeleteProject}
          className="text-sm text-muted hover:text-red-500"
        >
          Supprimer le projet
        </button>
      </div>

      <header className="mt-4 mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{project.name}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to={`/projects/${projectId}/screening/title-abstract`}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-accent"
          >
            Tri sur titre/résumé
          </Link>
          <Link
            to={`/projects/${projectId}/screening/full-text`}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-accent"
          >
            Tri en texte intégral
          </Link>
          <Link
            to={`/projects/${projectId}/extraction`}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-accent"
          >
            Extraction de données
          </Link>
          <Link
            to={`/projects/${projectId}/prisma-flow`}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-accent"
          >
            Diagramme PRISMA
          </Link>
          <Link
            to={`/projects/${projectId}/meta-analysis`}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-accent"
          >
            Méta-analyse
          </Link>
          <Link
            to={`/projects/${projectId}/export`}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Export
          </Link>
        </div>
      </header>

      <section className="mb-12 rounded-xl border border-line p-6">
        <h2 className="mb-4 text-lg font-medium text-ink">Nouvelle recherche OpenAlex</h2>

        <div className="space-y-4">
          <input
            value={queryName}
            onChange={(e) => setQueryName(e.target.value)}
            placeholder="Nom de la recherche (optionnel)"
            className="w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />

          <div>
            <textarea
              value={queryString}
              onChange={(e) => setQueryString(e.target.value)}
              placeholder="Mots-clés (ex. cognitive behavioral therapy anxiety)"
              rows={2}
              className="w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-muted">
              Recherche plein texte : les mots séparés par un espace doivent apparaître ensemble.
              Une virgule n'a aucun effet particulier. Syntaxe reconnue :{' '}
              <code className="rounded bg-surface px-1 py-0.5">OR</code> pour "l'un ou l'autre" (ex.
              sleep OR insomnia), guillemets pour une phrase exacte (ex. "cognitive decline"),{' '}
              <code className="rounded bg-surface px-1 py-0.5">NOT</code> pour exclure un terme.
            </p>
          </div>

          <div className="flex gap-4">
            <label className="flex-1 text-sm text-muted">
              Depuis
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
              />
            </label>
            <label className="flex-1 text-sm text-muted">
              Jusqu'à
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm text-muted">Types de documents</p>
            <div className="flex flex-wrap gap-2">
              {WORK_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleType(t.value)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    selectedTypes.includes(t.value)
                      ? 'border-accent bg-accent text-white'
                      : 'border-line text-ink hover:border-accent'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={openAccessOnly}
                onChange={(e) => setOpenAccessOnly(e.target.checked)}
              />
              Open access uniquement
            </label>

            <label className="flex items-center gap-2 text-sm text-muted">
              Max résultats à importer
              <input
                type="number"
                min={1}
                max={10000}
                value={maxRecords}
                onChange={(e) => setMaxRecords(Number(e.target.value))}
                className="w-24 rounded-lg border border-line bg-canvas px-2 py-1 text-ink focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading || !queryString.trim()}
              className="rounded-lg border border-line px-4 py-2 font-medium text-ink transition hover:border-accent disabled:opacity-50"
            >
              {previewLoading ? 'Aperçu…' : 'Aperçu du nombre de résultats'}
            </button>
            <button
              type="button"
              onClick={handleRunSearch}
              disabled={runLoading || !queryString.trim()}
              className="rounded-lg bg-accent px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {runLoading ? 'Lancement…' : 'Lancer la recherche et importer'}
            </button>
            {previewCount !== null && (
              <span className="text-sm text-muted">
                {previewCount.toLocaleString('fr-FR')} résultats sur OpenAlex
              </span>
            )}
          </div>
        </div>
      </section>

      {searchQueries.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-medium text-ink">Recherches effectuées</h2>
          <ul className="divide-y divide-line rounded-xl border border-line">
            <li className="px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSearchQueryId(undefined)
                  setPage(1)
                }}
                className={`text-sm ${selectedSearchQueryId === undefined ? 'font-medium text-accent' : 'text-muted'}`}
              >
                Tous les records
              </button>
            </li>
            {searchQueries.map((sq) => (
              <li key={sq.id} className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSearchQueryId(sq.id)
                    setPage(1)
                  }}
                  className="text-left"
                >
                  <p className={`text-sm ${selectedSearchQueryId === sq.id ? 'font-medium text-accent' : 'text-ink'}`}>
                    {sq.name}
                  </p>
                  <p className="text-xs text-muted">
                    "{sq.query_string}" · {sq.result_count} résultats importés
                    {(sq.status === 'pending' || sq.status === 'running') && (
                      <span className="ml-1 text-accent">· import en cours…</span>
                    )}
                    {sq.status === 'failed' && (
                      <span className="ml-1 text-red-500">
                        · échec{sq.error_message ? ` : ${sq.error_message}` : ''}
                      </span>
                    )}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium text-ink">
          Records {records ? `(${records.total})` : ''}
        </h2>

        {records && records.items.length === 0 && (
          <p className="text-muted">Aucun record importé pour le moment.</p>
        )}

        <ul className="space-y-4">
          {records?.items.map((record) => (
            <li key={record.id} className="rounded-xl border border-line p-4">
              <p className="font-medium text-ink">{record.title ?? 'Sans titre'}</p>
              <p className="mt-1 text-xs text-muted">
                {record.authors?.slice(0, 3).join(', ')}
                {record.authors && record.authors.length > 3 ? ' et al.' : ''}
                {record.venue ? ` · ${record.venue}` : ''}
                {record.publication_year ? ` · ${record.publication_year}` : ''}
              </p>
              {record.abstract && (
                <p className="mt-2 line-clamp-3 text-sm text-muted">{record.abstract}</p>
              )}
            </li>
          ))}
        </ul>

        {records && records.total > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Précédent
            </button>
            <span className="text-sm text-muted">
              Page {page} / {Math.ceil(records.total / PAGE_SIZE)}
            </span>
            <button
              type="button"
              disabled={page >= Math.ceil(records.total / PAGE_SIZE)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
