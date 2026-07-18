export type Project = {
  id: number
  name: string
  description: string | null
  research_question: string | null
  inclusion_criteria: string | null
  exclusion_criteria: string | null
  mailto: string | null
  created_at: string
  updated_at: string
}

export type ProjectCreate = {
  name: string
  description?: string
  research_question?: string
  mailto?: string
}

export type SearchFilters = {
  from_publication_date?: string | null
  to_publication_date?: string | null
  work_types?: string[] | null
  open_access_only?: boolean | null
}

export type SearchQueryStatus = 'pending' | 'running' | 'completed' | 'failed'

export type SearchQuery = {
  id: number
  name: string
  query_string: string
  filters: SearchFilters | null
  result_count: number
  executed_at: string | null
  created_at: string
  status: SearchQueryStatus
  error_message: string | null
}

export type SearchQueryCreate = {
  name: string
  query_string: string
  filters?: SearchFilters
  max_records?: number
}

export type RecordItem = {
  id: number
  openalex_id: string | null
  doi: string | null
  title: string | null
  abstract: string | null
  authors: string[] | null
  publication_year: number | null
  venue: string | null
  work_type: string | null
  created_at: string
}

export type RecordListResponse = {
  total: number
  page: number
  page_size: number
  items: RecordItem[]
}

export type ScreeningStage = 'title_abstract' | 'full_text'
export type ScreeningDecisionValue = 'include' | 'exclude' | 'maybe'

export type ScreeningProgress = {
  stage: ScreeningStage
  total: number
  screened: number
  included: number
  excluded: number
  maybe: number
  remaining: number
}

export type ScreeningHistoryItem = {
  decision_id: number
  stage: ScreeningStage
  decision: ScreeningDecisionValue
  reason: string | null
  decided_at: string
  record: RecordItem
}

export type PrismaFlow = {
  records_identified: number
  duplicates_removed: number
  records_screened: number
  records_excluded_title_abstract: number
  exclusion_reasons_title_abstract: Record<string, number>
  reports_sought_full_text: number
  records_excluded_full_text: number
  exclusion_reasons_full_text: Record<string, number>
  records_included: number
  pending_title_abstract: number
  maybe_title_abstract: number
  pending_full_text: number
  maybe_full_text: number
}

export type ExtractionFieldType = 'text' | 'number' | 'boolean' | 'select'

export type ExtractionField = {
  id: number
  name: string
  field_type: ExtractionFieldType
  options: string[] | null
  order: number
}

export type ExtractionFieldCreate = {
  name: string
  field_type: ExtractionFieldType
  options?: string[]
  order?: number
}

export type ExtractionFieldUpdate = {
  name?: string
  field_type?: ExtractionFieldType
  options?: string[]
  order?: number
}

export type ExtractionMatrixRow = {
  record: RecordItem
  values: Record<number, string | null>
}

export type ExtractionMatrix = {
  fields: ExtractionField[]
  rows: ExtractionMatrixRow[]
}

export type EffectMeasure = 'OR' | 'RR' | 'MD' | 'SMD' | 'CUSTOM'
export type MetaModelType = 'fixed' | 'random'

export type EffectSize = {
  id: number
  record_id: number
  label: string
  measure: EffectMeasure
  raw_inputs: Record<string, number>
  effect_size: number
  variance: number
  display_effect: number
  display_ci_low: number
  display_ci_high: number
  created_at: string
}

export type EffectSizeCreate = {
  record_id: number
  label: string
  measure: EffectMeasure
  raw_inputs: Record<string, number>
}

export type MetaAnalysisStudyResult = {
  effect_size_id: number
  label: string
  record_id: number
  display_effect: number
  display_ci_low: number
  display_ci_high: number
  weight_pct: number
}

export type MetaAnalysisResult = {
  id: number
  name: string
  measure: EffectMeasure
  model_type: MetaModelType
  k: number
  pooled_display_effect: number
  pooled_display_ci_low: number
  pooled_display_ci_high: number
  z: number
  p_value: number
  q: number
  df: number
  tau2: number
  i2: number
  studies: MetaAnalysisStudyResult[]
  created_at: string
}

export type PrismaChecklistItem = {
  id: string
  section: string
  prompt: string
  status: string | null
  location: string | null
}

export type PrismaChecklist = {
  items: PrismaChecklistItem[]
  updated_at: string | null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function buildQueryString(params: Record<string, unknown>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)))
    } else {
      search.append(key, String(value))
    }
  }
  return search.toString()
}

export const api = {
  listProjects: () => request<Project[]>('/api/projects'),
  getProject: (projectId: number) => request<Project>(`/api/projects/${projectId}`),
  createProject: (payload: ProjectCreate) =>
    request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteProject: (projectId: number) =>
    request<void>(`/api/projects/${projectId}`, { method: 'DELETE' }),

  previewSearch: (
    projectId: number,
    params: { q: string; from_date?: string; to_date?: string; types?: string[]; open_access_only?: boolean },
  ) =>
    request<{ count: number }>(
      `/api/projects/${projectId}/openalex/preview?${buildQueryString(params)}`,
    ),

  createSearchQuery: (projectId: number, payload: SearchQueryCreate) =>
    request<SearchQuery>(`/api/projects/${projectId}/search-queries`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listSearchQueries: (projectId: number) =>
    request<SearchQuery[]>(`/api/projects/${projectId}/search-queries`),

  listRecords: (projectId: number, params: { page?: number; page_size?: number; search_query_id?: number }) =>
    request<RecordListResponse>(
      `/api/projects/${projectId}/records?${buildQueryString(params)}`,
    ),

  getScreeningQueue: (projectId: number, stage: ScreeningStage, limit = 1) =>
    request<RecordItem[]>(
      `/api/projects/${projectId}/screening/queue?${buildQueryString({ stage, limit })}`,
    ),

  getScreeningProgress: (projectId: number, stage: ScreeningStage) =>
    request<ScreeningProgress>(
      `/api/projects/${projectId}/screening/progress?${buildQueryString({ stage })}`,
    ),

  getScreeningHistory: (projectId: number, stage: ScreeningStage) =>
    request<ScreeningHistoryItem[]>(
      `/api/projects/${projectId}/screening/history?${buildQueryString({ stage })}`,
    ),

  setScreeningDecision: (
    projectId: number,
    recordId: number,
    payload: { stage: ScreeningStage; decision: ScreeningDecisionValue; reason?: string },
  ) =>
    request(`/api/projects/${projectId}/records/${recordId}/screening-decisions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteScreeningDecision: (projectId: number, recordId: number, stage: ScreeningStage) =>
    request<void>(
      `/api/projects/${projectId}/records/${recordId}/screening-decisions/${stage}`,
      { method: 'DELETE' },
    ),

  getPrismaFlow: (projectId: number) => request<PrismaFlow>(`/api/projects/${projectId}/prisma-flow`),

  listExtractionFields: (projectId: number) =>
    request<ExtractionField[]>(`/api/projects/${projectId}/extraction-fields`),

  createExtractionField: (projectId: number, payload: ExtractionFieldCreate) =>
    request<ExtractionField>(`/api/projects/${projectId}/extraction-fields`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateExtractionField: (projectId: number, fieldId: number, payload: ExtractionFieldUpdate) =>
    request<ExtractionField>(`/api/projects/${projectId}/extraction-fields/${fieldId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteExtractionField: (projectId: number, fieldId: number) =>
    request<void>(`/api/projects/${projectId}/extraction-fields/${fieldId}`, { method: 'DELETE' }),

  getExtractionMatrix: (projectId: number) =>
    request<ExtractionMatrix>(`/api/projects/${projectId}/extraction-matrix`),

  setExtractionValue: (projectId: number, recordId: number, fieldId: number, value: string | null) =>
    request<{ value: string | null }>(
      `/api/projects/${projectId}/records/${recordId}/extraction-values/${fieldId}`,
      { method: 'PUT', body: JSON.stringify({ value }) },
    ),

  listEffectSizes: (projectId: number, measure?: EffectMeasure) =>
    request<EffectSize[]>(
      `/api/projects/${projectId}/effect-sizes?${buildQueryString({ measure })}`,
    ),

  createEffectSize: (projectId: number, payload: EffectSizeCreate) =>
    request<EffectSize>(`/api/projects/${projectId}/effect-sizes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteEffectSize: (projectId: number, effectSizeId: number) =>
    request<void>(`/api/projects/${projectId}/effect-sizes/${effectSizeId}`, { method: 'DELETE' }),

  runMetaAnalysis: (
    projectId: number,
    payload: { name: string; measure: EffectMeasure; model_type: MetaModelType },
  ) =>
    request<MetaAnalysisResult>(`/api/projects/${projectId}/meta-analyses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listMetaAnalyses: (projectId: number) =>
    request<MetaAnalysisResult[]>(`/api/projects/${projectId}/meta-analyses`),

  deleteMetaAnalysis: (projectId: number, metaAnalysisId: number) =>
    request<void>(`/api/projects/${projectId}/meta-analyses/${metaAnalysisId}`, { method: 'DELETE' }),

  getPrismaChecklist: (projectId: number) =>
    request<PrismaChecklist>(`/api/projects/${projectId}/prisma-checklist`),

  updatePrismaChecklist: (
    projectId: number,
    answers: Record<string, { status: string | null; location: string | null }>,
  ) =>
    request<PrismaChecklist>(`/api/projects/${projectId}/prisma-checklist`, {
      method: 'PUT',
      body: JSON.stringify({ answers }),
    }),

  exportUrl: (projectId: number, kind: 'records.csv' | 'extraction.csv' | 'effect-sizes.csv' | 'report.md') =>
    `/api/projects/${projectId}/export/${kind}`,
}
