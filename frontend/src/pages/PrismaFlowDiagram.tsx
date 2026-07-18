import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toPng, toSvg } from 'html-to-image'
import { api, type PrismaFlow, type Project } from '../lib/api'

function Box({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'exclude' }) {
  return (
    <div
      className={`w-[380px] rounded-xl border px-5 py-4 text-sm leading-relaxed ${
        tone === 'exclude' ? 'border-red-200 bg-red-50/60 text-ink' : 'border-line bg-canvas text-ink'
      }`}
    >
      {children}
    </div>
  )
}

function DownConnector() {
  return (
    <div className="w-[380px] flex flex-col items-center py-1">
      <div className="h-6 w-0.5 bg-line" />
      <div className="h-0 w-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-line" />
    </div>
  )
}

function RightConnector() {
  return (
    <div className="flex items-center px-1">
      <div className="h-0.5 w-6 bg-line" />
      <div className="h-0 w-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-line" />
    </div>
  )
}

function Row({ main, side }: { main: React.ReactNode; side?: React.ReactNode }) {
  return (
    <div className="flex items-start">
      {main}
      {side && (
        <div className="flex items-center">
          <RightConnector />
          {side}
        </div>
      )}
    </div>
  )
}

function ReasonList({ reasons }: { reasons: Record<string, number> }) {
  const entries = Object.entries(reasons)
  if (entries.length === 0) return null
  return (
    <ul className="mt-2 space-y-0.5 text-xs text-muted">
      {entries.map(([reason, count]) => (
        <li key={reason}>
          {reason} (n = {count})
        </li>
      ))}
    </ul>
  )
}

export default function PrismaFlowDiagram() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)

  const [project, setProject] = useState<Project | null>(null)
  const [flow, setFlow] = useState<PrismaFlow | null>(null)
  const [exporting, setExporting] = useState(false)
  const diagramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectId) return
    api.getProject(projectId).then(setProject)
    api.getPrismaFlow(projectId).then(setFlow)
  }, [projectId])

  const handleExport = async (format: 'png' | 'svg') => {
    if (!diagramRef.current) return
    setExporting(true)
    try {
      const dataUrl =
        format === 'png'
          ? await toPng(diagramRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 })
          : await toSvg(diagramRef.current, { backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `prisma-flow.${format}`
      link.href = dataUrl
      link.click()
    } finally {
      setExporting(false)
    }
  }

  if (!flow || !project) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-muted">Chargement…</div>
  }

  const afterDuplicates = flow.records_identified - flow.duplicates_removed

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <Link to={`/projects/${projectId}`} className="text-sm text-accent hover:underline">
        ← Retour au projet
      </Link>

      <header className="mt-4 mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Diagramme de flux PRISMA</h1>
          <p className="mt-1 text-sm text-muted">{project.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExport('svg')}
            disabled={exporting}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-accent disabled:opacity-50"
          >
            Exporter SVG
          </button>
          <button
            type="button"
            onClick={() => handleExport('png')}
            disabled={exporting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Exporter PNG
          </button>
        </div>
      </header>

      <div ref={diagramRef} className="inline-flex flex-col bg-canvas p-2">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Identification</p>
        <Row main={<Box>Records identifiés via OpenAlex<br />(n = {flow.records_identified})</Box>} />
        <DownConnector />
        <Row
          main={
            <Box>
              Records après suppression des doublons
              <br />
              (n = {afterDuplicates})
            </Box>
          }
          side={<Box tone="exclude">Doublons retirés (n = {flow.duplicates_removed})</Box>}
        />
        <DownConnector />

        <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Sélection</p>
        <Row
          main={
            <Box>
              Records criblés (titre / résumé)
              <br />
              (n = {flow.records_screened})
            </Box>
          }
          side={
            <Box tone="exclude">
              Records exclus (n = {flow.records_excluded_title_abstract})
              <ReasonList reasons={flow.exclusion_reasons_title_abstract} />
            </Box>
          }
        />
        <DownConnector />
        <Row
          main={
            <Box>
              Rapports recherchés en texte intégral
              <br />
              (n = {flow.reports_sought_full_text})
            </Box>
          }
          side={
            <Box tone="exclude">
              Rapports exclus (n = {flow.records_excluded_full_text})
              <ReasonList reasons={flow.exclusion_reasons_full_text} />
            </Box>
          }
        />
        <DownConnector />

        <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Inclusion</p>
        <Row main={<Box>Études incluses dans la revue<br />(n = {flow.records_included})</Box>} />
      </div>

      {(flow.maybe_title_abstract > 0 || flow.maybe_full_text > 0 || flow.pending_title_abstract > 0 || flow.pending_full_text > 0) && (
        <div className="mt-8 rounded-xl border border-line p-4 text-sm text-muted">
          <p className="font-medium text-ink">En attente de décision finale</p>
          <ul className="mt-1 space-y-0.5">
            {flow.pending_title_abstract > 0 && <li>{flow.pending_title_abstract} record(s) pas encore criblés (titre/résumé)</li>}
            {flow.maybe_title_abstract > 0 && <li>{flow.maybe_title_abstract} record(s) marqués incertains (titre/résumé)</li>}
            {flow.pending_full_text > 0 && <li>{flow.pending_full_text} record(s) pas encore criblés (texte intégral)</li>}
            {flow.maybe_full_text > 0 && <li>{flow.maybe_full_text} record(s) marqués incertains (texte intégral)</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
