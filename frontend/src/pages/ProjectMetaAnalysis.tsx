import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  api,
  type EffectMeasure,
  type EffectSize,
  type MetaAnalysisResult,
  type MetaModelType,
  type RecordItem,
} from '../lib/api'
import ForestPlot from '../components/ForestPlot'

const MEASURE_LABEL: Record<EffectMeasure, string> = {
  MD: 'Différence de moyennes (MD)',
  SMD: "Différence standardisée / Hedges' g (SMD)",
  OR: 'Odds ratio (OR)',
  RR: 'Risque relatif (RR)',
  CUSTOM: 'Personnalisé',
}

const CONTINUOUS_FIELDS = [
  { key: 'n1', label: 'n (groupe 1)' },
  { key: 'mean1', label: 'Moyenne (groupe 1)' },
  { key: 'sd1', label: 'Écart-type (groupe 1)' },
  { key: 'n2', label: 'n (groupe 2)' },
  { key: 'mean2', label: 'Moyenne (groupe 2)' },
  { key: 'sd2', label: 'Écart-type (groupe 2)' },
] as const

const BINARY_FIELDS = [
  { key: 'events1', label: 'Événements (groupe 1)' },
  { key: 'n1', label: 'n (groupe 1)' },
  { key: 'events2', label: 'Événements (groupe 2)' },
  { key: 'n2', label: 'n (groupe 2)' },
] as const

const CUSTOM_FIELDS = [
  { key: 'effect_size', label: 'Taille d\'effet' },
  { key: 'se', label: 'Erreur standard (SE)' },
] as const

function fieldsForMeasure(measure: EffectMeasure) {
  if (measure === 'MD' || measure === 'SMD') return CONTINUOUS_FIELDS
  if (measure === 'OR' || measure === 'RR') return BINARY_FIELDS
  return CUSTOM_FIELDS
}

export default function ProjectMetaAnalysis() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)

  const [includedRecords, setIncludedRecords] = useState<RecordItem[]>([])
  const [effectSizes, setEffectSizes] = useState<EffectSize[]>([])
  const [history, setHistory] = useState<MetaAnalysisResult[]>([])
  const [currentResult, setCurrentResult] = useState<MetaAnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [recordId, setRecordId] = useState<number | null>(null)
  const [label, setLabel] = useState('')
  const [measure, setMeasure] = useState<EffectMeasure>('MD')
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({})

  const [runName, setRunName] = useState('')
  const [runMeasure, setRunMeasure] = useState<EffectMeasure>('MD')
  const [runModel, setRunModel] = useState<MetaModelType>('random')
  const [running, setRunning] = useState(false)

  const loadAll = useCallback(async () => {
    const [matrix, sizes, runs] = await Promise.all([
      api.getExtractionMatrix(projectId),
      api.listEffectSizes(projectId),
      api.listMetaAnalyses(projectId),
    ])
    setIncludedRecords(matrix.rows.map((r) => r.record))
    setEffectSizes(sizes)
    setHistory(runs)
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    loadAll().finally(() => setLoading(false))
  }, [projectId, loadAll])

  const handleAddEffectSize = async () => {
    if (!recordId || !label.trim()) return
    setError(null)
    const parsed: Record<string, number> = {}
    for (const f of fieldsForMeasure(measure)) {
      const v = Number(rawInputs[f.key])
      if (Number.isNaN(v)) {
        setError(`Champ invalide : ${f.label}`)
        return
      }
      parsed[f.key] = v
    }
    try {
      await api.createEffectSize(projectId, { record_id: recordId, label: label.trim(), measure, raw_inputs: parsed })
      setLabel('')
      setRawInputs({})
      await loadAll()
    } catch {
      setError('Calcul impossible avec ces valeurs — vérifie les effectifs et écarts-types.')
    }
  }

  const handleDeleteEffectSize = async (id: number) => {
    await api.deleteEffectSize(projectId, id)
    await loadAll()
  }

  const handleRun = async () => {
    if (!runName.trim()) return
    setRunning(true)
    setError(null)
    try {
      const result = await api.runMetaAnalysis(projectId, {
        name: runName.trim(),
        measure: runMeasure,
        model_type: runModel,
      })
      setCurrentResult(result)
      setRunName('')
      await loadAll()
    } catch {
      setError("Aucune taille d'effet disponible pour cette mesure.")
    } finally {
      setRunning(false)
    }
  }

  const handleDeleteRun = async (runId: number) => {
    await api.deleteMetaAnalysis(projectId, runId)
    if (currentResult?.id === runId) setCurrentResult(null)
    await loadAll()
  }

  const measuresWithData = Array.from(new Set(effectSizes.map((e) => e.measure)))

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-muted">Chargement…</div>
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <Link to={`/projects/${projectId}`} className="text-sm text-accent hover:underline">
        ← Retour au projet
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Méta-analyse</h1>
        <p className="mt-1 text-sm text-muted">
          Tailles d'effet par étude incluse, puis combinaison (effets fixes ou aléatoires).
        </p>
      </header>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {includedRecords.length === 0 ? (
        <div className="rounded-xl border border-line p-8 text-center">
          <p className="text-lg font-medium text-ink">Aucune étude incluse pour l'instant</p>
          <p className="mt-1 text-sm text-muted">
            Il faut au moins une étude incluse au stade texte intégral pour saisir une taille d'effet.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-8 rounded-xl border border-line p-5">
            <h2 className="mb-3 text-sm font-medium text-ink">Ajouter une taille d'effet</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted">Étude</label>
                <select
                  value={recordId ?? ''}
                  onChange={(e) => setRecordId(Number(e.target.value) || null)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">— Choisir —</option>
                  {includedRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title?.slice(0, 60) ?? `Record #${r.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted">Libellé</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="ex. Smith 2020"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted">Mesure</label>
                <select
                  value={measure}
                  onChange={(e) => {
                    setMeasure(e.target.value as EffectMeasure)
                    setRawInputs({})
                  }}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  {Object.entries(MEASURE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {fieldsForMeasure(measure).map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-muted">{f.label}</label>
                  <input
                    type="number"
                    value={rawInputs[f.key] ?? ''}
                    onChange={(e) => setRawInputs((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddEffectSize}
              disabled={!recordId || !label.trim()}
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Ajouter
            </button>
          </section>

          {effectSizes.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-medium text-ink">Tailles d'effet saisies</h2>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {effectSizes.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm text-ink">
                        {e.label} <span className="text-muted">— {MEASURE_LABEL[e.measure]}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {e.display_effect.toFixed(2)} [{e.display_ci_low.toFixed(2)}, {e.display_ci_high.toFixed(2)}]
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteEffectSize(e.id)}
                      className="shrink-0 text-sm text-muted hover:text-red-500"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mb-10 rounded-xl border border-line p-5">
            <h2 className="mb-3 text-sm font-medium text-ink">Lancer une méta-analyse</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-muted">Nom</label>
                <input
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  placeholder="ex. Anxiété — mesure principale"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Mesure</label>
                <select
                  value={runMeasure}
                  onChange={(e) => setRunMeasure(e.target.value as EffectMeasure)}
                  className="mt-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  {measuresWithData.length === 0 && <option value={runMeasure}>{MEASURE_LABEL[runMeasure]}</option>}
                  {measuresWithData.map((m) => (
                    <option key={m} value={m}>
                      {MEASURE_LABEL[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted">Modèle</label>
                <select
                  value={runModel}
                  onChange={(e) => setRunModel(e.target.value as MetaModelType)}
                  className="mt-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="random">Effets aléatoires (DerSimonian-Laird)</option>
                  <option value="fixed">Effets fixes</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleRun}
                disabled={running || !runName.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {running ? 'Calcul…' : 'Lancer'}
              </button>
            </div>
          </section>

          {currentResult && (
            <section className="mb-10 rounded-xl border border-line p-6">
              <h2 className="text-lg font-medium text-ink">{currentResult.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {currentResult.k} études · modèle {currentResult.model_type === 'random' ? 'à effets aléatoires' : 'à effets fixes'} ·{' '}
                {MEASURE_LABEL[currentResult.measure]}
              </p>
              <p className="mt-3 text-sm text-ink">
                Effet combiné : <strong>{currentResult.pooled_display_effect.toFixed(3)}</strong> [
                {currentResult.pooled_display_ci_low.toFixed(3)}, {currentResult.pooled_display_ci_high.toFixed(3)}] ·
                z = {currentResult.z.toFixed(2)} · p = {currentResult.p_value < 0.001 ? '< 0.001' : currentResult.p_value.toFixed(3)}
              </p>
              <p className="mt-1 text-sm text-muted">
                Hétérogénéité : Q = {currentResult.q.toFixed(2)} (df = {currentResult.df}) · I² = {currentResult.i2.toFixed(1)}% · τ² = {currentResult.tau2.toFixed(3)}
              </p>

              <div className="mt-6 overflow-x-auto">
                <ForestPlot
                  studies={currentResult.studies}
                  pooled={{
                    display_effect: currentResult.pooled_display_effect,
                    display_ci_low: currentResult.pooled_display_ci_low,
                    display_ci_high: currentResult.pooled_display_ci_high,
                  }}
                  measure={currentResult.measure}
                />
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-ink">Historique</h2>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {history.map((run) => (
                  <li key={run.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setCurrentResult(run)}
                      className="text-left text-sm text-ink hover:text-accent"
                    >
                      {run.name}{' '}
                      <span className="text-muted">
                        — {MEASURE_LABEL[run.measure]}, {run.model_type === 'random' ? 'aléatoire' : 'fixe'}, k={run.k}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRun(run.id)}
                      className="shrink-0 text-sm text-muted hover:text-red-500"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
