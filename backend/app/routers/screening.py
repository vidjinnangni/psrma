from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/projects/{project_id}", tags=["screening"])


def _get_project(project_id: int, db: Session) -> models.Project:
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _screenable_query(project_id: int, stage: models.ScreeningStage, db: Session):
    query = db.query(models.Record).filter_by(project_id=project_id)
    done_subq = db.query(models.ScreeningDecision.record_id).filter_by(stage=stage)

    if stage == models.ScreeningStage.FULL_TEXT:
        included_subq = db.query(models.ScreeningDecision.record_id).filter_by(
            stage=models.ScreeningStage.TITLE_ABSTRACT,
            decision=models.ScreeningDecisionValue.INCLUDE,
        )
        query = query.filter(models.Record.id.in_(included_subq))

    return query.filter(~models.Record.id.in_(done_subq))


@router.get("/screening/queue", response_model=list[schemas.RecordRead])
def get_queue(
    project_id: int,
    stage: models.ScreeningStage,
    limit: int = Query(default=1, ge=1, le=50),
    db: Session = Depends(get_db),
):
    _get_project(project_id, db)
    return _screenable_query(project_id, stage, db).order_by(models.Record.id).limit(limit).all()


@router.get("/screening/progress", response_model=schemas.ScreeningProgress)
def get_progress(project_id: int, stage: models.ScreeningStage, db: Session = Depends(get_db)):
    _get_project(project_id, db)

    if stage == models.ScreeningStage.TITLE_ABSTRACT:
        total = db.query(models.Record).filter_by(project_id=project_id).count()
    else:
        total = (
            db.query(models.ScreeningDecision)
            .join(models.Record)
            .filter(
                models.Record.project_id == project_id,
                models.ScreeningDecision.stage == models.ScreeningStage.TITLE_ABSTRACT,
                models.ScreeningDecision.decision == models.ScreeningDecisionValue.INCLUDE,
            )
            .count()
        )

    decisions = (
        db.query(models.ScreeningDecision)
        .join(models.Record)
        .filter(models.Record.project_id == project_id, models.ScreeningDecision.stage == stage)
        .all()
    )
    included = sum(1 for d in decisions if d.decision == models.ScreeningDecisionValue.INCLUDE)
    excluded = sum(1 for d in decisions if d.decision == models.ScreeningDecisionValue.EXCLUDE)
    maybe = sum(1 for d in decisions if d.decision == models.ScreeningDecisionValue.MAYBE)
    screened = len(decisions)

    return schemas.ScreeningProgress(
        stage=stage,
        total=total,
        screened=screened,
        included=included,
        excluded=excluded,
        maybe=maybe,
        remaining=total - screened,
    )


@router.get("/screening/history", response_model=list[schemas.ScreeningHistoryItem])
def get_history(project_id: int, stage: models.ScreeningStage, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    decisions = (
        db.query(models.ScreeningDecision)
        .join(models.Record)
        .filter(models.Record.project_id == project_id, models.ScreeningDecision.stage == stage)
        .order_by(models.ScreeningDecision.decided_at.desc())
        .all()
    )
    return [
        schemas.ScreeningHistoryItem(
            decision_id=d.id,
            stage=d.stage,
            decision=d.decision,
            reason=d.reason,
            decided_at=d.decided_at,
            record=d.record,
        )
        for d in decisions
    ]


@router.post("/records/{record_id}/screening-decisions", response_model=schemas.ScreeningDecisionRead)
def set_screening_decision(
    project_id: int,
    record_id: int,
    payload: schemas.ScreeningDecisionCreate,
    db: Session = Depends(get_db),
):
    _get_project(project_id, db)
    record = db.get(models.Record, record_id)
    if record is None or record.project_id != project_id:
        raise HTTPException(status_code=404, detail="Record not found")

    decision = (
        db.query(models.ScreeningDecision)
        .filter_by(record_id=record_id, stage=payload.stage)
        .first()
    )
    if decision is None:
        decision = models.ScreeningDecision(record_id=record_id, stage=payload.stage)
        db.add(decision)

    decision.decision = payload.decision
    decision.reason = payload.reason
    decision.decided_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.commit()
    db.refresh(decision)
    return decision


@router.delete("/records/{record_id}/screening-decisions/{stage}", status_code=204)
def delete_screening_decision(
    project_id: int,
    record_id: int,
    stage: models.ScreeningStage,
    db: Session = Depends(get_db),
):
    _get_project(project_id, db)
    decision = (
        db.query(models.ScreeningDecision)
        .join(models.Record)
        .filter(
            models.Record.project_id == project_id,
            models.ScreeningDecision.record_id == record_id,
            models.ScreeningDecision.stage == stage,
        )
        .first()
    )
    if decision is None:
        raise HTTPException(status_code=404, detail="Decision not found")
    db.delete(decision)
    db.commit()
