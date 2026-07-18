import math

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import meta_analysis, models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/projects/{project_id}", tags=["meta-analysis"])


def _get_project(project_id: int, db: Session) -> models.Project:
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _to_effect_size_read(entry: models.EffectSizeEntry) -> schemas.EffectSizeRead:
    se = math.sqrt(entry.variance)
    ci_low = entry.effect_size - meta_analysis.Z_95 * se
    ci_high = entry.effect_size + meta_analysis.Z_95 * se
    return schemas.EffectSizeRead(
        id=entry.id,
        record_id=entry.record_id,
        label=entry.label,
        measure=entry.measure,
        raw_inputs=entry.raw_inputs,
        effect_size=entry.effect_size,
        variance=entry.variance,
        display_effect=meta_analysis.to_display_scale(entry.measure, entry.effect_size),
        display_ci_low=meta_analysis.to_display_scale(entry.measure, ci_low),
        display_ci_high=meta_analysis.to_display_scale(entry.measure, ci_high),
        created_at=entry.created_at,
    )


@router.post("/effect-sizes", response_model=schemas.EffectSizeRead, status_code=201)
def create_effect_size(project_id: int, payload: schemas.EffectSizeCreate, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    record = db.get(models.Record, payload.record_id)
    if record is None or record.project_id != project_id:
        raise HTTPException(status_code=404, detail="Record not found")

    try:
        effect, variance = meta_analysis.compute_effect_size(payload.measure, payload.raw_inputs)
    except (ValueError, KeyError, ZeroDivisionError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    entry = models.EffectSizeEntry(
        project_id=project_id,
        record_id=payload.record_id,
        label=payload.label,
        measure=payload.measure,
        raw_inputs=payload.raw_inputs,
        effect_size=effect,
        variance=variance,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _to_effect_size_read(entry)


@router.get("/effect-sizes", response_model=list[schemas.EffectSizeRead])
def list_effect_sizes(
    project_id: int, measure: models.EffectMeasure | None = None, db: Session = Depends(get_db)
):
    _get_project(project_id, db)
    query = db.query(models.EffectSizeEntry).filter_by(project_id=project_id)
    if measure is not None:
        query = query.filter_by(measure=measure)
    entries = query.order_by(models.EffectSizeEntry.created_at).all()
    return [_to_effect_size_read(e) for e in entries]


@router.patch("/effect-sizes/{effect_size_id}", response_model=schemas.EffectSizeRead)
def update_effect_size(
    project_id: int,
    effect_size_id: int,
    payload: schemas.EffectSizeUpdate,
    db: Session = Depends(get_db),
):
    _get_project(project_id, db)
    entry = db.get(models.EffectSizeEntry, effect_size_id)
    if entry is None or entry.project_id != project_id:
        raise HTTPException(status_code=404, detail="Effect size not found")

    if payload.label is not None:
        entry.label = payload.label

    if payload.measure is not None or payload.raw_inputs is not None:
        measure = payload.measure or entry.measure
        raw_inputs = payload.raw_inputs if payload.raw_inputs is not None else entry.raw_inputs
        try:
            effect, variance = meta_analysis.compute_effect_size(measure, raw_inputs)
        except (ValueError, KeyError, ZeroDivisionError, TypeError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        entry.measure = measure
        entry.raw_inputs = raw_inputs
        entry.effect_size = effect
        entry.variance = variance

    db.commit()
    db.refresh(entry)
    return _to_effect_size_read(entry)


@router.delete("/effect-sizes/{effect_size_id}", status_code=204)
def delete_effect_size(project_id: int, effect_size_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    entry = db.get(models.EffectSizeEntry, effect_size_id)
    if entry is None or entry.project_id != project_id:
        raise HTTPException(status_code=404, detail="Effect size not found")
    db.delete(entry)
    db.commit()


def _build_result(
    model_row: models.MetaAnalysisModel, measure: models.EffectMeasure, pooled: dict, studies
) -> schemas.MetaAnalysisResult:
    return schemas.MetaAnalysisResult(
        id=model_row.id,
        name=model_row.name,
        measure=measure,
        model_type=model_row.model_type,
        k=pooled["k"],
        pooled_display_effect=meta_analysis.to_display_scale(measure, pooled["pooled_effect"]),
        pooled_display_ci_low=meta_analysis.to_display_scale(measure, pooled["ci_low"]),
        pooled_display_ci_high=meta_analysis.to_display_scale(measure, pooled["ci_high"]),
        z=pooled["z"],
        p_value=pooled["p_value"],
        q=pooled["q"],
        df=pooled["df"],
        tau2=pooled["tau2"],
        i2=pooled["i2"],
        studies=studies,
        created_at=model_row.created_at,
    )


@router.post("/meta-analyses", response_model=schemas.MetaAnalysisResult, status_code=201)
def run_meta_analysis(
    project_id: int, payload: schemas.MetaAnalysisRunRequest, db: Session = Depends(get_db)
):
    _get_project(project_id, db)
    query = db.query(models.EffectSizeEntry).filter_by(project_id=project_id, measure=payload.measure)
    if payload.effect_size_ids:
        query = query.filter(models.EffectSizeEntry.id.in_(payload.effect_size_ids))
    entries = query.order_by(models.EffectSizeEntry.id).all()

    if not entries:
        raise HTTPException(status_code=400, detail="Aucune taille d'effet disponible pour cette mesure")

    try:
        pooled = meta_analysis.pool_effects(
            [(e.effect_size, e.variance) for e in entries], payload.model_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    total_weight = sum(pooled["weights"])
    studies = []
    for entry, weight in zip(entries, pooled["weights"]):
        se_i = math.sqrt(entry.variance)
        ci_low_i = entry.effect_size - meta_analysis.Z_95 * se_i
        ci_high_i = entry.effect_size + meta_analysis.Z_95 * se_i
        studies.append(
            schemas.MetaAnalysisStudyResult(
                effect_size_id=entry.id,
                label=entry.label,
                record_id=entry.record_id,
                display_effect=meta_analysis.to_display_scale(payload.measure, entry.effect_size),
                display_ci_low=meta_analysis.to_display_scale(payload.measure, ci_low_i),
                display_ci_high=meta_analysis.to_display_scale(payload.measure, ci_high_i),
                weight_pct=(weight / total_weight) * 100,
            )
        )

    result_payload = {
        "measure": payload.measure.value,
        "k": pooled["k"],
        "pooled_display_effect": meta_analysis.to_display_scale(payload.measure, pooled["pooled_effect"]),
        "pooled_display_ci_low": meta_analysis.to_display_scale(payload.measure, pooled["ci_low"]),
        "pooled_display_ci_high": meta_analysis.to_display_scale(payload.measure, pooled["ci_high"]),
        "z": pooled["z"],
        "p_value": pooled["p_value"],
        "q": pooled["q"],
        "df": pooled["df"],
        "tau2": pooled["tau2"],
        "i2": pooled["i2"],
        "studies": [s.model_dump() for s in studies],
    }

    model_row = models.MetaAnalysisModel(
        project_id=project_id,
        name=payload.name,
        model_type=payload.model_type,
        method="DerSimonian-Laird" if payload.model_type == models.ModelType.RANDOM else "Variance inverse (effets fixes)",
        results=result_payload,
    )
    db.add(model_row)
    db.commit()
    db.refresh(model_row)

    return _build_result(model_row, payload.measure, pooled, studies)


@router.get("/meta-analyses", response_model=list[schemas.MetaAnalysisResult])
def list_meta_analyses(project_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    rows = (
        db.query(models.MetaAnalysisModel)
        .filter_by(project_id=project_id)
        .order_by(models.MetaAnalysisModel.created_at.desc())
        .all()
    )
    results = []
    for row in rows:
        r = row.results
        results.append(
            schemas.MetaAnalysisResult(
                id=row.id,
                name=row.name,
                measure=r["measure"],
                model_type=row.model_type,
                k=r["k"],
                pooled_display_effect=r["pooled_display_effect"],
                pooled_display_ci_low=r["pooled_display_ci_low"],
                pooled_display_ci_high=r["pooled_display_ci_high"],
                z=r["z"],
                p_value=r["p_value"],
                q=r["q"],
                df=r["df"],
                tau2=r["tau2"],
                i2=r["i2"],
                studies=r["studies"],
                created_at=row.created_at,
            )
        )
    return results


@router.delete("/meta-analyses/{meta_analysis_id}", status_code=204)
def delete_meta_analysis(project_id: int, meta_analysis_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    row = db.get(models.MetaAnalysisModel, meta_analysis_id)
    if row is None or row.project_id != project_id:
        raise HTTPException(status_code=404, detail="Meta-analysis not found")
    db.delete(row)
    db.commit()
