import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  api,
  type ExtractionField,
  type ExtractionFieldType,
  type ExtractionMatrixRow,
} from '../lib/api'

const FIELD_TYPE_LABEL: Record<ExtractionFieldType, string> = {
  text: 'Texte',
  number: 'Nombre',
  boolean: 'Oui/Non',
  select: 'Liste',
}

export default function ProjectExtraction() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)

  const [fields, setFields] = useState<ExtractionField[]>([])
  const [rows, setRows] = useState<ExtractionMatrixRow[]>([])
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<ExtractionFieldType>('text')
  const [newOptions, setNewOptions] = useState('')

  const loadAll = useCallback(async () => {
    const [f, matrix] = await Promise.all([
      api.listExtractionFields(projectId),
      api.getExtractionMatrix(projectId),
    ])
    setFields(f)
    setRows(matrix.rows)
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    loadAll().finally(() => setLoading(false))
  }, [projectId, loadAll])

  const handleAddField = async () => {
    if (!newName.trim()) return
    await api.createExtractionField(projectId, {
      name: newName.trim(),
      field_type: newType,
      options:
        newType === 'select'
          ? newOptions.split(',').map((o) => o.trim()).filter(Boolean)
          : undefined,
    })
    setNewName('')
    setNewOptions('')
    setNewType('text')
    await loadAll()
  }

  const handleRenameField = async (field: ExtractionField, name: string) => {
    if (name === field.name || !name.trim()) return
    setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, name } : f)))
    await api.updateExtractionField(projectId, field.id, { name: name.trim() })
  }

  const handleDeleteField = async (field: ExtractionField) => {
    if (!window.confirm(`Supprimer le champ "${field.name}" ? Toutes ses valeurs seront perdues.`)) return
    await api.deleteExtractionField(projectId, field.id)
    await loadAll()
  }

  const handleValueChange = async (recordId: number, fieldId: number, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.record.id === recordId
          ? { ...row, values: { ...row.values, [fieldId]: value } }
          : row,
      ),
    )
    await api.setExtractionValue(projectId, recordId, fieldId, value || null)
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-muted">Chargement…</div>
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <Link to={`/projects/${projectId}`} className="text-sm text-accent hover:underline">
        ← Retour au projet
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Extraction de données</h1>
        <p className="mt-1 text-sm text-muted">
          Une ligne par étude incluse (texte intégral), une colonne par champ d'extraction.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-line p-5">
        <h2 className="mb-3 text-sm font-medium text-ink">Ajouter un champ</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-muted">Nom du champ</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex. Design de l'étude"
              className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Type</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as ExtractionFieldType)}
              className="mt-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {Object.entries(FIELD_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {newType === 'select' && (
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-muted">Options (séparées par des virgules)</label>
              <input
                value={newOptions}
                onChange={(e) => setNewOptions(e.target.value)}
                placeholder="Faible, Modéré, Élevé"
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleAddField}
            disabled={!newName.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line p-8 text-center">
          <p className="text-lg font-medium text-ink">Aucune étude incluse pour l'instant</p>
          <p className="mt-1 text-sm text-muted">
            L'extraction ne porte que sur les records inclus au stade texte intégral.
          </p>
          <Link
            to={`/projects/${projectId}/screening/full-text`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            Aller au tri en texte intégral →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left font-medium text-ink">
                  Étude
                </th>
                {fields.map((field) => (
                  <th key={field.id} className="min-w-[200px] px-4 py-3 text-left font-medium text-ink">
                    <div className="flex items-center gap-2">
                      <input
                        defaultValue={field.name}
                        onBlur={(e) => handleRenameField(field, e.target.value)}
                        className="w-full min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-medium text-ink hover:border-line focus:border-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteField(field)}
                        className="shrink-0 text-xs text-muted hover:text-red-500"
                        title="Supprimer ce champ"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="mt-0.5 px-1 text-xs font-normal text-muted">
                      {FIELD_TYPE_LABEL[field.field_type]}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.record.id} className="border-b border-line last:border-0">
                  <td className="sticky left-0 z-10 max-w-[280px] bg-canvas px-4 py-3 align-top">
                    <p className="line-clamp-2 font-medium text-ink">
                      {row.record.title ?? 'Sans titre'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{row.record.publication_year}</p>
                  </td>
                  {fields.map((field) => {
                    const value = row.values[field.id] ?? ''
                    return (
                      <td key={field.id} className="px-4 py-3 align-top">
                        {field.field_type === 'boolean' ? (
                          <input
                            type="checkbox"
                            checked={value === 'true'}
                            onChange={(e) =>
                              handleValueChange(row.record.id, field.id, e.target.checked ? 'true' : 'false')
                            }
                          />
                        ) : field.field_type === 'select' ? (
                          <select
                            value={value}
                            onChange={(e) => handleValueChange(row.record.id, field.id, e.target.value)}
                            className="w-full rounded-lg border border-line bg-canvas px-2 py-1.5 text-ink focus:border-accent focus:outline-none"
                          >
                            <option value="" />
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.field_type === 'number' ? 'number' : 'text'}
                            defaultValue={value}
                            onBlur={(e) => handleValueChange(row.record.id, field.id, e.target.value)}
                            className="w-full rounded-lg border border-line bg-canvas px-2 py-1.5 text-ink focus:border-accent focus:outline-none"
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
