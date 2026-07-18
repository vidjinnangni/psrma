from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/projects/{project_id}", tags=["prisma-flow"])


def _get_project(project_id: int, db: Session) -> models.Project:
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _decision_count(
    db: Session,
    project_id: int,
    stage: models.ScreeningStage,
    decision: models.ScreeningDecisionValue,
) -> int:
    return (
        db.query(models.ScreeningDecision)
        .join(models.Record)
        .filter(
            models.Record.project_id == project_id,
            models.ScreeningDecision.stage == stage,
            models.ScreeningDecision.decision == decision,
        )
        .count()
    )


def _reason_breakdown(db: Session, project_id: int, stage: models.ScreeningStage) -> dict[str, int]:
    rows = (
        db.query(models.ScreeningDecision.reason, func.count(models.ScreeningDecision.id))
        .join(models.Record)
        .filter(
            models.Record.project_id == project_id,
            models.ScreeningDecision.stage == stage,
            models.ScreeningDecision.decision == models.ScreeningDecisionValue.EXCLUDE,
        )
        .group_by(models.ScreeningDecision.reason)
        .all()
    )
    return {(reason or "Non précisé"): count for reason, count in rows}


@router.get("/prisma-flow", response_model=schemas.PrismaFlow)
def get_prisma_flow(project_id: int, db: Session = Depends(get_db)):
    project = _get_project(project_id, db)

    records_identified = sum(sq.result_count for sq in project.search_queries)
    records_screened = db.query(models.Record).filter_by(project_id=project_id).count()
    duplicates_removed = max(records_identified - records_screened, 0)

    excluded_ta = _decision_count(
        db, project_id, models.ScreeningStage.TITLE_ABSTRACT, models.ScreeningDecisionValue.EXCLUDE
    )
    maybe_ta = _decision_count(
        db, project_id, models.ScreeningStage.TITLE_ABSTRACT, models.ScreeningDecisionValue.MAYBE
    )
    included_ta = _decision_count(
        db, project_id, models.ScreeningStage.TITLE_ABSTRACT, models.ScreeningDecisionValue.INCLUDE
    )
    pending_ta = records_screened - excluded_ta - maybe_ta - included_ta

    excluded_ft = _decision_count(
        db, project_id, models.ScreeningStage.FULL_TEXT, models.ScreeningDecisionValue.EXCLUDE
    )
    maybe_ft = _decision_count(
        db, project_id, models.ScreeningStage.FULL_TEXT, models.ScreeningDecisionValue.MAYBE
    )
    included_ft = _decision_count(
        db, project_id, models.ScreeningStage.FULL_TEXT, models.ScreeningDecisionValue.INCLUDE
    )
    pending_ft = included_ta - excluded_ft - maybe_ft - included_ft

    return schemas.PrismaFlow(
        records_identified=records_identified,
        duplicates_removed=duplicates_removed,
        records_screened=records_screened,
        records_excluded_title_abstract=excluded_ta,
        exclusion_reasons_title_abstract=_reason_breakdown(
            db, project_id, models.ScreeningStage.TITLE_ABSTRACT
        ),
        reports_sought_full_text=included_ta,
        records_excluded_full_text=excluded_ft,
        exclusion_reasons_full_text=_reason_breakdown(db, project_id, models.ScreeningStage.FULL_TEXT),
        records_included=included_ft,
        pending_title_abstract=pending_ta,
        maybe_title_abstract=maybe_ta,
        pending_full_text=pending_ft,
        maybe_full_text=maybe_ft,
    )
