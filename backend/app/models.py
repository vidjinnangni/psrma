import enum
from datetime import datetime

from sqlalchemy import (
    JSON,
    Enum,
    ForeignKey,
    String,
    Table,
    Column,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ScreeningStage(str, enum.Enum):
    TITLE_ABSTRACT = "title_abstract"
    FULL_TEXT = "full_text"


class ScreeningDecisionValue(str, enum.Enum):
    INCLUDE = "include"
    EXCLUDE = "exclude"
    MAYBE = "maybe"


class ExtractionFieldType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SELECT = "select"


class EffectMeasure(str, enum.Enum):
    ODDS_RATIO = "OR"
    RISK_RATIO = "RR"
    MEAN_DIFFERENCE = "MD"
    STANDARDIZED_MEAN_DIFFERENCE = "SMD"
    CUSTOM = "CUSTOM"


class ModelType(str, enum.Enum):
    FIXED = "fixed"
    RANDOM = "random"


class ImportJobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


record_search_query = Table(
    "record_search_query",
    Base.metadata,
    Column("record_id", ForeignKey("records.id"), primary_key=True),
    Column("search_query_id", ForeignKey("search_queries.id"), primary_key=True),
)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(2000), default=None)
    research_question: Mapped[str | None] = mapped_column(String(2000), default=None)
    inclusion_criteria: Mapped[str | None] = mapped_column(String(4000), default=None)
    exclusion_criteria: Mapped[str | None] = mapped_column(String(4000), default=None)
    mailto: Mapped[str | None] = mapped_column(String(255), default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    search_queries: Mapped[list["SearchQuery"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    records: Mapped[list["Record"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    extraction_fields: Mapped[list["ExtractionFieldDef"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    meta_analysis_models: Mapped[list["MetaAnalysisModel"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    prisma_checklist: Mapped["PrismaChecklist | None"] = relationship(
        back_populates="project", cascade="all, delete-orphan", uselist=False
    )


class SearchQuery(Base):
    __tablename__ = "search_queries"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(String(255))
    query_string: Mapped[str] = mapped_column(String(2000))
    filters: Mapped[dict | None] = mapped_column(JSON, default=None)
    result_count: Mapped[int] = mapped_column(default=0)
    executed_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="search_queries")
    records: Mapped[list["Record"]] = relationship(secondary=record_search_query, back_populates="found_by_queries")
    import_job: Mapped["SearchImportJob | None"] = relationship(
        back_populates="search_query", cascade="all, delete-orphan", uselist=False
    )


class SearchImportJob(Base):
    __tablename__ = "search_import_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    search_query_id: Mapped[int] = mapped_column(ForeignKey("search_queries.id"), unique=True)
    status: Mapped[ImportJobStatus] = mapped_column(
        Enum(ImportJobStatus, native_enum=False), default=ImportJobStatus.PENDING
    )
    imported_count: Mapped[int] = mapped_column(default=0)
    error_message: Mapped[str | None] = mapped_column(String(1000), default=None)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    search_query: Mapped["SearchQuery"] = relationship(back_populates="import_job")


class Record(Base):
    __tablename__ = "records"
    __table_args__ = (UniqueConstraint("project_id", "openalex_id", name="uq_project_openalex_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    openalex_id: Mapped[str | None] = mapped_column(String(255), default=None)
    doi: Mapped[str | None] = mapped_column(String(255), default=None)
    title: Mapped[str | None] = mapped_column(String(2000), default=None)
    abstract: Mapped[str | None] = mapped_column(String(20000), default=None)
    authors: Mapped[list | None] = mapped_column(JSON, default=None)
    publication_year: Mapped[int | None] = mapped_column(default=None)
    venue: Mapped[str | None] = mapped_column(String(500), default=None)
    work_type: Mapped[str | None] = mapped_column(String(100), default=None)
    raw_data: Mapped[dict | None] = mapped_column(JSON, default=None)
    duplicate_of_id: Mapped[int | None] = mapped_column(ForeignKey("records.id"), default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="records")
    found_by_queries: Mapped[list["SearchQuery"]] = relationship(secondary=record_search_query, back_populates="records")
    screening_decisions: Mapped[list["ScreeningDecision"]] = relationship(back_populates="record", cascade="all, delete-orphan")
    extraction_values: Mapped[list["ExtractionValue"]] = relationship(back_populates="record", cascade="all, delete-orphan")
    effect_size_entries: Mapped[list["EffectSizeEntry"]] = relationship(back_populates="record", cascade="all, delete-orphan")
    duplicate_of: Mapped["Record | None"] = relationship(remote_side=[id])


class ScreeningDecision(Base):
    __tablename__ = "screening_decisions"
    __table_args__ = (UniqueConstraint("record_id", "stage", name="uq_record_stage"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id"))
    stage: Mapped[ScreeningStage] = mapped_column(Enum(ScreeningStage, native_enum=False))
    decision: Mapped[ScreeningDecisionValue] = mapped_column(Enum(ScreeningDecisionValue, native_enum=False))
    reason: Mapped[str | None] = mapped_column(String(1000), default=None)
    decided_at: Mapped[datetime] = mapped_column(server_default=func.now())

    record: Mapped["Record"] = relationship(back_populates="screening_decisions")


class ExtractionFieldDef(Base):
    __tablename__ = "extraction_field_defs"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(String(255))
    field_type: Mapped[ExtractionFieldType] = mapped_column(Enum(ExtractionFieldType, native_enum=False))
    options: Mapped[list | None] = mapped_column(JSON, default=None)
    order: Mapped[int] = mapped_column(default=0)

    project: Mapped["Project"] = relationship(back_populates="extraction_fields")
    values: Mapped[list["ExtractionValue"]] = relationship(back_populates="field_def", cascade="all, delete-orphan")


class ExtractionValue(Base):
    __tablename__ = "extraction_values"
    __table_args__ = (UniqueConstraint("record_id", "field_def_id", name="uq_record_field"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id"))
    field_def_id: Mapped[int] = mapped_column(ForeignKey("extraction_field_defs.id"))
    value: Mapped[str | None] = mapped_column(String(4000), default=None)

    record: Mapped["Record"] = relationship(back_populates="extraction_values")
    field_def: Mapped["ExtractionFieldDef"] = relationship(back_populates="values")


class EffectSizeEntry(Base):
    __tablename__ = "effect_size_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id"))
    label: Mapped[str] = mapped_column(String(255))
    measure: Mapped[EffectMeasure] = mapped_column(Enum(EffectMeasure, native_enum=False))
    raw_inputs: Mapped[dict] = mapped_column(JSON)
    effect_size: Mapped[float | None] = mapped_column(default=None)
    variance: Mapped[float | None] = mapped_column(default=None)
    ci_low: Mapped[float | None] = mapped_column(default=None)
    ci_high: Mapped[float | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    project: Mapped["Project"] = relationship()
    record: Mapped["Record"] = relationship(back_populates="effect_size_entries")


class MetaAnalysisModel(Base):
    __tablename__ = "meta_analysis_models"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(String(255))
    model_type: Mapped[ModelType] = mapped_column(Enum(ModelType, native_enum=False))
    method: Mapped[str] = mapped_column(String(50))
    results: Mapped[dict | None] = mapped_column(JSON, default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="meta_analysis_models")


class PrismaChecklist(Base):
    __tablename__ = "prisma_checklists"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), unique=True)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    project: Mapped["Project"] = relationship(back_populates="prisma_checklist")
