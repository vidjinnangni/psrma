import csv
import io
import math

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app import meta_analysis, models, schemas
from app.database import get_db
from app.prisma_checklist_items import CHECKLIST_ITEMS
from app.routers.prisma_flow import get_prisma_flow

router = APIRouter(prefix="/api/projects/{project_id}", tags=["export"])


def _get_project(project_id: int, db: Session) -> models.Project:
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


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


def _csv_response(buf: io.StringIO, filename: str) -> Response:
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


_FORMULA_TRIGGER_CHARS = ("=", "+", "-", "@", "\t", "\r")


def _safe_cell(value):
    """Neutralize CSV/DDE formula injection: Excel/LibreOffice evaluate a cell as a
    formula if it starts with certain characters, even when the file is plain CSV."""
    if isinstance(value, str) and value.startswith(_FORMULA_TRIGGER_CHARS):
        return "'" + value
    return value


def _write_row(writer, row: list) -> None:
    writer.writerow([_safe_cell(v) for v in row])


@router.get("/export/records.csv")
def export_records_csv(project_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    records = db.query(models.Record).filter_by(project_id=project_id).order_by(models.Record.id).all()

    decisions_by_record: dict[int, dict[str, models.ScreeningDecision]] = {}
    decisions = (
        db.query(models.ScreeningDecision)
        .join(models.Record)
        .filter(models.Record.project_id == project_id)
        .all()
    )
    for d in decisions:
        decisions_by_record.setdefault(d.record_id, {})[d.stage.value] = d

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id", "openalex_id", "doi", "title", "authors", "publication_year", "venue", "work_type",
            "titre_resume_decision", "titre_resume_motif", "texte_integral_decision", "texte_integral_motif",
        ]
    )
    for r in records:
        d = decisions_by_record.get(r.id, {})
        ta = d.get("title_abstract")
        ft = d.get("full_text")
        _write_row(
            writer,
            [
                r.id, r.openalex_id, r.doi, r.title,
                "; ".join(r.authors or []), r.publication_year, r.venue, r.work_type,
                ta.decision.value if ta else "", ta.reason if ta else "",
                ft.decision.value if ft else "", ft.reason if ft else "",
            ],
        )
    return _csv_response(buf, "records.csv")


@router.get("/export/extraction.csv")
def export_extraction_csv(project_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    fields = (
        db.query(models.ExtractionFieldDef)
        .filter_by(project_id=project_id)
        .order_by(models.ExtractionFieldDef.order, models.ExtractionFieldDef.id)
        .all()
    )
    records = _included_records(project_id, db)

    buf = io.StringIO()
    writer = csv.writer(buf)
    _write_row(writer, ["record_id", "title", "publication_year"] + [f.name for f in fields])
    for r in records:
        values = {v.field_def_id: v.value for v in r.extraction_values}
        _write_row(writer, [r.id, r.title, r.publication_year] + [values.get(f.id) or "" for f in fields])
    return _csv_response(buf, "extraction.csv")


@router.get("/export/effect-sizes.csv")
def export_effect_sizes_csv(project_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    entries = (
        db.query(models.EffectSizeEntry)
        .filter_by(project_id=project_id)
        .order_by(models.EffectSizeEntry.id)
        .all()
    )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["id", "record_id", "label", "measure", "display_effect", "display_ci_low", "display_ci_high"]
    )
    for e in entries:
        se = math.sqrt(e.variance)
        ci_low = e.effect_size - meta_analysis.Z_95 * se
        ci_high = e.effect_size + meta_analysis.Z_95 * se
        _write_row(
            writer,
            [
                e.id, e.record_id, e.label, e.measure.value,
                meta_analysis.to_display_scale(e.measure, e.effect_size),
                meta_analysis.to_display_scale(e.measure, ci_low),
                meta_analysis.to_display_scale(e.measure, ci_high),
            ],
        )
    return _csv_response(buf, "effect-sizes.csv")


@router.get("/export/report.md")
def export_report(project_id: int, db: Session = Depends(get_db)):
    project = _get_project(project_id, db)
    lines: list[str] = [f"# Revue systématique — {project.name}", ""]

    if project.research_question:
        lines.append(f"**Question de recherche :** {project.research_question}")
    if project.inclusion_criteria:
        lines.append(f"**Critères d'inclusion :** {project.inclusion_criteria}")
    if project.exclusion_criteria:
        lines.append(f"**Critères d'exclusion :** {project.exclusion_criteria}")

    lines += ["", "## Méthode de recherche", ""]
    queries = (
        db.query(models.SearchQuery)
        .filter_by(project_id=project_id)
        .order_by(models.SearchQuery.created_at)
        .all()
    )
    if queries:
        for q in queries:
            lines.append(f"- **{q.name}** — requête `{q.query_string}` — {q.result_count} résultats importés")
    else:
        lines.append("_Aucune recherche effectuée pour l'instant._")

    flow = get_prisma_flow(project_id, db)
    lines += [
        "",
        "## Diagramme de flux PRISMA",
        "",
        f"- Records identifiés : {flow.records_identified}",
        f"- Doublons retirés : {flow.duplicates_removed}",
        f"- Records criblés (titre/résumé) : {flow.records_screened}",
        f"- Exclus (titre/résumé) : {flow.records_excluded_title_abstract}",
        f"- Recherchés en texte intégral : {flow.reports_sought_full_text}",
        f"- Exclus (texte intégral) : {flow.records_excluded_full_text}",
        f"- **Études incluses : {flow.records_included}**",
    ]

    lines += ["", "## Études incluses", ""]
    included = _included_records(project_id, db)
    fields = (
        db.query(models.ExtractionFieldDef)
        .filter_by(project_id=project_id)
        .order_by(models.ExtractionFieldDef.order, models.ExtractionFieldDef.id)
        .all()
    )
    if included:
        lines.append("| Étude | Année | Revue |" + "".join(f" {f.name} |" for f in fields))
        lines.append("|---" * (3 + len(fields)) + "|")
        for r in included:
            values = {v.field_def_id: v.value for v in r.extraction_values}
            lines.append(
                f"| {r.title or ''} | {r.publication_year or ''} | {r.venue or ''} |"
                + "".join(f" {values.get(f.id) or ''} |" for f in fields)
            )
    else:
        lines.append("_Aucune étude incluse pour l'instant._")

    lines += ["", "## Méta-analyses", ""]
    runs = (
        db.query(models.MetaAnalysisModel)
        .filter_by(project_id=project_id)
        .order_by(models.MetaAnalysisModel.created_at)
        .all()
    )
    if runs:
        for run in runs:
            r = run.results
            lines += [
                f"### {run.name}",
                f"- Mesure : {r['measure']} — modèle : {run.method}",
                f"- k = {r['k']} études",
                f"- Effet combiné : {r['pooled_display_effect']:.3f} [{r['pooled_display_ci_low']:.3f}, {r['pooled_display_ci_high']:.3f}]",
                f"- z = {r['z']:.2f}, p = {r['p_value']:.4f}",
                f"- Hétérogénéité : Q = {r['q']:.2f} (df={r['df']}), I² = {r['i2']:.1f}%, τ² = {r['tau2']:.3f}",
                "",
            ]
    else:
        lines.append("_Aucune méta-analyse réalisée pour l'instant._")

    content = "\n".join(lines) + "\n"
    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": "attachment; filename=rapport.md"},
    )


@router.get("/prisma-checklist", response_model=schemas.PrismaChecklistRead)
def get_checklist(project_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    row = db.query(models.PrismaChecklist).filter_by(project_id=project_id).first()
    answers = row.answers if row else {}
    items = [
        schemas.PrismaChecklistItemRead(
            id=item["id"],
            section=item["section"],
            prompt=item["prompt"],
            status=answers.get(item["id"], {}).get("status"),
            location=answers.get(item["id"], {}).get("location"),
        )
        for item in CHECKLIST_ITEMS
    ]
    return schemas.PrismaChecklistRead(items=items, updated_at=row.updated_at if row else None)


@router.put("/prisma-checklist", response_model=schemas.PrismaChecklistRead)
def update_checklist(
    project_id: int, payload: schemas.PrismaChecklistUpdate, db: Session = Depends(get_db)
):
    _get_project(project_id, db)
    row = db.query(models.PrismaChecklist).filter_by(project_id=project_id).first()
    if row is None:
        row = models.PrismaChecklist(project_id=project_id, answers={})
        db.add(row)
    row.answers = {k: v.model_dump() for k, v in payload.answers.items()}
    db.commit()
    db.refresh(row)
    return get_checklist(project_id, db)
