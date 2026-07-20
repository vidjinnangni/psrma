import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Project } from '../lib/api'

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    api
      .listProjects()
      .then(setProjects)
      .catch(() => setError("Impossible de joindre l'API. Le serveur backend est-il lancé ?"))
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const project = await api.createProject({ name: name.trim() })
    setProjects((prev) => [project, ...prev])
    setName('')
  }

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(
      `Supprimer définitivement "${project.name}" ? Toutes les recherches, décisions de tri, extractions et méta-analyses associées seront perdues. Cette action est irréversible.`,
    )
    if (!confirmed) return
    await api.deleteProject(project.id)
    setProjects((prev) => prev.filter((p) => p.id !== project.id))
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Revues systématiques
        </h1>
        <p className="mt-2 text-muted">
          Recherche, tri PRISMA et méta-analyse à partir d'OpenAlex.
        </p>
      </header>

      <form onSubmit={handleCreate} className="mb-10 flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du nouveau projet de revue"
          className="flex-1 rounded-lg border border-line bg-canvas px-4 py-2.5 text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white transition hover:opacity-90"
        >
          Créer
        </button>
      </form>

      {loading && <p className="text-muted">Chargement…</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <p className="text-muted">Aucun projet pour le moment.</p>
      )}

      <ul className="divide-y divide-line">
        {projects.map((project) => (
          <li key={project.id} className="flex items-start justify-between gap-4 py-4">
            <div>
              <Link to={`/projects/${project.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                {project.name}
              </Link>
              {project.research_question && (
                <p className="mt-1 text-sm text-muted">{project.research_question}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleDelete(project)}
              className="shrink-0 text-sm text-muted hover:text-red-500"
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
