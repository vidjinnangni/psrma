import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type PrismaChecklistItem } from '../lib/api'

const STATUS_OPTIONS = [
  { value: '', label: 'Non renseigné' },
  { value: 'yes', label: 'Rapporté' },
  { value: 'partial', label: 'Partiel' },
  { value: 'no', label: 'Non rapporté' },
  { value: 'na', label: 'Non applicable' },
]

export default function ProjectExport() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)

  const [items, setItems] = useState<PrismaChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    api.getPrismaChecklist(projectId).then((c) => {
      setItems(c.items)
      setLoading(false)
    })
  }, [projectId])

  const saveAll = async (nextItems: PrismaChecklistItem[]) => {
    const answers = Object.fromEntries(
      nextItems.map((i) => [i.id, { status: i.status || null, location: i.location || null }]),
    )
    await api.updatePrismaChecklist(projectId, answers)
  }

  const handleStatusChange = (itemId: string, status: string) => {
    const next = items.map((i) => (i.id === itemId ? { ...i, status } : i))
    setItems(next)
    saveAll(next)
  }

  const handleLocationBlur = (itemId: string, location: string) => {
    const next = items.map((i) => (i.id === itemId ? { ...i, location } : i))
    setItems(next)
    saveAll(next)
  }

  const sections = Array.from(new Set(items.map((i) => i.section)))

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <Link to={`/projects/${projectId}`} className="text-sm text-accent hover:underline">
        ← Retour au projet
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Export</h1>
        <p className="mt-1 text-sm text-muted">
          Jeux de données exportables et checklist PRISMA 2020.
        </p>
      </header>

      <section className="mb-10 rounded-xl border border-line p-5">
        <h2 className="mb-4 text-sm font-medium text-ink">Exports de données</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={api.exportUrl(projectId, 'records.csv')}
            download
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-accent"
          >
            Records (CSV)
          </a>
          <a
            href={api.exportUrl(projectId, 'extraction.csv')}
            download
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-accent"
          >
            Extraction (CSV)
          </a>
          <a
            href={api.exportUrl(projectId, 'effect-sizes.csv')}
            download
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-accent"
          >
            Tailles d'effet (CSV)
          </a>
          <a
            href={api.exportUrl(projectId, 'report.md')}
            download
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Rapport (Markdown)
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium text-ink">Checklist PRISMA 2020</h2>
        <p className="mb-4 text-xs text-muted">
          Aide-mémoire inspiré de la structure de la déclaration PRISMA 2020 — à vérifier contre le
          document officiel avant soumission.
        </p>

        {loading && <p className="text-muted">Chargement…</p>}

        {!loading &&
          sections.map((section) => (
            <div key={section} className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {section}
              </h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {items
                  .filter((i) => i.section === section)
                  .map((item) => (
                    <li key={item.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 text-xs font-medium text-muted">
                          {item.id}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-ink">{item.prompt}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <select
                              value={item.status ?? ''}
                              onChange={(e) => handleStatusChange(item.id, e.target.value)}
                              className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
                            >
                              {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <input
                              defaultValue={item.location ?? ''}
                              onBlur={(e) => handleLocationBlur(item.id, e.target.value)}
                              placeholder="Emplacement dans le manuscrit (page, section...)"
                              className="min-w-[240px] flex-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
      </section>
    </div>
  )
}
