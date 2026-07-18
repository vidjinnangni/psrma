from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import EffectMeasure, ExtractionFieldType, ModelType, ScreeningDecisionValue, ScreeningStage


class ProjectBase(BaseModel):
    name: str
    description: str | None = None
    research_question: str | None = None
    inclusion_criteria: str | None = None
    exclusion_criteria: str | None = None
    mailto: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    research_question: str | None = None
    inclusion_criteria: str | None = None
    exclusion_criteria: str | None = None
    mailto: str | None = None


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class SearchFilters(BaseModel):
    from_publication_date: date | None = None
    to_publication_date: date | None = None
    work_types: list[str] | None = None
    open_access_only: bool | None = None


class SearchPreviewResponse(BaseModel):
    count: int


class SearchQueryCreate(BaseModel):
    name: str
    query_string: str
    filters: SearchFilters | None = None
    max_records: int = Field(default=200, ge=1, le=10000)


class SearchQueryRead(BaseModel):
    id: int
    name: str
    query_string: str
    filters: dict | None = None
    result_count: int
    executed_at: datetime | None
    created_at: datetime
    status: str
    error_message: str | None = None


class RecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    openalex_id: str | None
    doi: str | None
    title: str | None
    abstract: str | None
    authors: list | None
    publication_year: int | None
    venue: str | None
    work_type: str | None
    created_at: datetime


class RecordListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[RecordRead]


class ScreeningDecisionCreate(BaseModel):
    stage: ScreeningStage
    decision: ScreeningDecisionValue
    reason: str | None = None


class ScreeningDecisionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    record_id: int
    stage: ScreeningStage
    decision: ScreeningDecisionValue
    reason: str | None
    decided_at: datetime


class ScreeningProgress(BaseModel):
    stage: ScreeningStage
    total: int
    screened: int
    included: int
    excluded: int
    maybe: int
    remaining: int


class ScreeningHistoryItem(BaseModel):
    decision_id: int
    stage: ScreeningStage
    decision: ScreeningDecisionValue
    reason: str | None
    decided_at: datetime
    record: RecordRead


class ExtractionFieldCreate(BaseModel):
    name: str
    field_type: ExtractionFieldType
    options: list[str] | None = None
    order: int | None = None


class ExtractionFieldUpdate(BaseModel):
    name: str | None = None
    field_type: ExtractionFieldType | None = None
    options: list[str] | None = None
    order: int | None = None


class ExtractionFieldRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    field_type: ExtractionFieldType
    options: list[str] | None
    order: int


class ExtractionValueSet(BaseModel):
    value: str | None = None


class ExtractionMatrixRow(BaseModel):
    record: RecordRead
    values: dict[int, str | None]


class ExtractionMatrix(BaseModel):
    fields: list[ExtractionFieldRead]
    rows: list[ExtractionMatrixRow]


class EffectSizeCreate(BaseModel):
    record_id: int
    label: str
    measure: EffectMeasure
    raw_inputs: dict


class EffectSizeUpdate(BaseModel):
    label: str | None = None
    measure: EffectMeasure | None = None
    raw_inputs: dict | None = None


class EffectSizeRead(BaseModel):
    id: int
    record_id: int
    label: str
    measure: EffectMeasure
    raw_inputs: dict
    effect_size: float
    variance: float
    display_effect: float
    display_ci_low: float
    display_ci_high: float
    created_at: datetime


class MetaAnalysisRunRequest(BaseModel):
    name: str
    measure: EffectMeasure
    model_type: ModelType = ModelType.RANDOM
    effect_size_ids: list[int] | None = None


class MetaAnalysisStudyResult(BaseModel):
    effect_size_id: int
    label: str
    record_id: int
    display_effect: float
    display_ci_low: float
    display_ci_high: float
    weight_pct: float


class MetaAnalysisResult(BaseModel):
    id: int
    name: str
    measure: EffectMeasure
    model_type: ModelType
    k: int
    pooled_display_effect: float
    pooled_display_ci_low: float
    pooled_display_ci_high: float
    z: float
    p_value: float
    q: float
    df: int
    tau2: float
    i2: float
    studies: list[MetaAnalysisStudyResult]
    created_at: datetime


class PrismaFlow(BaseModel):
    records_identified: int
    duplicates_removed: int
    records_screened: int
    records_excluded_title_abstract: int
    exclusion_reasons_title_abstract: dict[str, int]
    reports_sought_full_text: int
    records_excluded_full_text: int
    exclusion_reasons_full_text: dict[str, int]
    records_included: int
    pending_title_abstract: int
    maybe_title_abstract: int
    pending_full_text: int
    maybe_full_text: int


class PrismaChecklistAnswer(BaseModel):
    status: str | None = None
    location: str | None = None


class PrismaChecklistUpdate(BaseModel):
    answers: dict[str, PrismaChecklistAnswer]


class PrismaChecklistItemRead(BaseModel):
    id: str
    section: str
    prompt: str
    status: str | None = None
    location: str | None = None


class PrismaChecklistRead(BaseModel):
    items: list[PrismaChecklistItemRead]
    updated_at: datetime | None
