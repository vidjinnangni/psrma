from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/projects/{project_id}", tags=["extraction"])


def _get_project(project_id: int, db: Session) -> models.Project:
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_field(project_id: int, field_id: int, db: Session) -> models.ExtractionFieldDef:
    field = db.get(models.ExtractionFieldDef, field_id)
    if field is None or field.project_id != project_id:
        raise HTTPException(status_code=404, detail="Extraction field not found")
    return field


@router.get("/extraction-fields", response_model=list[schemas.ExtractionFieldRead])
def list_extraction_fields(project_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    return (
        db.query(models.ExtractionFieldDef)
        .filter_by(project_id=project_id)
        .order_by(models.ExtractionFieldDef.order, models.ExtractionFieldDef.id)
        .all()
    )


@router.post("/extraction-fields", response_model=schemas.ExtractionFieldRead, status_code=201)
def create_extraction_field(
    project_id: int, payload: schemas.ExtractionFieldCreate, db: Session = Depends(get_db)
):
    _get_project(project_id, db)
    order = payload.order
    if order is None:
        order = db.query(models.ExtractionFieldDef).filter_by(project_id=project_id).count()

    field = models.ExtractionFieldDef(
        project_id=project_id,
        name=payload.name,
        field_type=payload.field_type,
        options=payload.options,
        order=order,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.patch("/extraction-fields/{field_id}", response_model=schemas.ExtractionFieldRead)
def update_extraction_field(
    project_id: int,
    field_id: int,
    payload: schemas.ExtractionFieldUpdate,
    db: Session = Depends(get_db),
):
    _get_project(project_id, db)
    field = _get_field(project_id, field_id, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(field, key, value)
    db.commit()
    db.refresh(field)
    return field


@router.delete("/extraction-fields/{field_id}", status_code=204)
def delete_extraction_field(project_id: int, field_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    field = _get_field(project_id, field_id, db)
    db.delete(field)
    db.commit()


def _included_records(project_id: int, db: Session) -> list[models.Record]:
    return (
        db.query(models.Record)
        .join(models.ScreeningDecision)
        .filter(
            models.Record.project_id == project_id,
            models.ScreeningDecision.stage == models.ScreeningStage.FULL_TEXT,
            models.ScreeningDecision.decision == models.ScreeningDecisionValue.INCLUDE,
        )
        .order_by(models.Record.id)
        .all()
    )


@router.get("/extraction-matrix", response_model=schemas.ExtractionMatrix)
def get_extraction_matrix(project_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    fields = (
        db.query(models.ExtractionFieldDef)
        .filter_by(project_id=project_id)
        .order_by(models.ExtractionFieldDef.order, models.ExtractionFieldDef.id)
        .all()
    )
    records = _included_records(project_id, db)

    rows = []
    for record in records:
        values = {v.field_def_id: v.value for v in record.extraction_values}
        rows.append(schemas.ExtractionMatrixRow(record=record, values=values))

    return schemas.ExtractionMatrix(fields=fields, rows=rows)


@router.put(
    "/records/{record_id}/extraction-values/{field_id}",
    response_model=schemas.ExtractionValueSet,
)
def set_extraction_value(
    project_id: int,
    record_id: int,
    field_id: int,
    payload: schemas.ExtractionValueSet,
    db: Session = Depends(get_db),
):
    _get_project(project_id, db)
    _get_field(project_id, field_id, db)

    record = db.get(models.Record, record_id)
    if record is None or record.project_id != project_id:
        raise HTTPException(status_code=404, detail="Record not found")

    value = (
        db.query(models.ExtractionValue)
        .filter_by(record_id=record_id, field_def_id=field_id)
        .first()
    )
    if value is None:
        value = models.ExtractionValue(record_id=record_id, field_def_id=field_id)
        db.add(value)

    value.value = payload.value
    db.commit()
    return schemas.ExtractionValueSet(value=value.value)
