from datetime import date, datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, openalex, schemas
from app.database import SessionLocal, get_db

router = APIRouter(prefix="/api/projects/{project_id}", tags=["search"])


def _get_project(project_id: int, db: Session) -> models.Project:
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _to_search_query_read(sq: models.SearchQuery, job: models.SearchImportJob | None) -> schemas.SearchQueryRead:
    if job is not None:
        status = job.status.value
        error_message = job.error_message
    else:
        # Recherches créées avant l'introduction du suivi en tâche de fond.
        status = models.ImportJobStatus.COMPLETED.value if sq.executed_at else models.ImportJobStatus.PENDING.value
        error_message = None
    return schemas.SearchQueryRead(
        id=sq.id,
        name=sq.name,
        query_string=sq.query_string,
        filters=sq.filters,
        result_count=sq.result_count,
        executed_at=sq.executed_at,
        created_at=sq.created_at,
        status=status,
        error_message=error_message,
    )


async def run_import_job_async(
    job_id: int,
    project_id: int,
    search_query_id: int,
    query_string: str,
    filters: dict | None,
    mailto: str | None,
    max_records: int,
) -> None:
    db = SessionLocal()
    try:
        job = db.get(models.SearchImportJob, job_id)
        search_query = db.get(models.SearchQuery, search_query_id)
        if job is None or search_query is None:
            return

        job.status = models.ImportJobStatus.RUNNING
        db.commit()

        filters_obj = schemas.SearchFilters(**filters) if filters else None
        imported = 0

        async for page in openalex.iter_works(query_string, filters_obj, mailto, max_records=max_records):
            for work in page:
                fields = openalex.work_to_record_fields(work)
                record = None
                if fields["openalex_id"]:
                    record = (
                        db.query(models.Record)
                        .filter_by(project_id=project_id, openalex_id=fields["openalex_id"])
                        .first()
                    )
                if record is None:
                    record = models.Record(project_id=project_id, **fields)
                    db.add(record)
                    db.flush()
                if search_query not in record.found_by_queries:
                    record.found_by_queries.append(search_query)

            imported += len(page)
            search_query.result_count = imported
            job.imported_count = imported
            db.commit()

        search_query.executed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        job.status = models.ImportJobStatus.COMPLETED
        db.commit()
    except Exception as exc:  # noqa: BLE001 - surface any failure on the job row
        db.rollback()
        job = db.get(models.SearchImportJob, job_id)
        if job is not None:
            job.status = models.ImportJobStatus.FAILED
            job.error_message = str(exc)[:1000]
            db.commit()
    finally:
        db.close()


@router.get("/openalex/preview", response_model=schemas.SearchPreviewResponse)
async def preview_search(
    project_id: int,
    q: str,
    from_date: date | None = None,
    to_date: date | None = None,
    types: list[str] | None = Query(default=None),
    open_access_only: bool | None = None,
    db: Session = Depends(get_db),
):
    project = _get_project(project_id, db)
    filters = schemas.SearchFilters(
        from_publication_date=from_date,
        to_publication_date=to_date,
        work_types=types,
        open_access_only=open_access_only,
    )
    count = await openalex.count_works(q, filters, project.mailto)
    return schemas.SearchPreviewResponse(count=count)


@router.post("/search-queries", response_model=schemas.SearchQueryRead, status_code=201)
def create_search_query(
    project_id: int,
    payload: schemas.SearchQueryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    project = _get_project(project_id, db)

    filters_dict = payload.filters.model_dump(mode="json") if payload.filters else None
    search_query = models.SearchQuery(
        project_id=project_id,
        name=payload.name,
        query_string=payload.query_string,
        filters=filters_dict,
        result_count=0,
    )
    db.add(search_query)
    db.flush()

    job = models.SearchImportJob(search_query_id=search_query.id, status=models.ImportJobStatus.PENDING)
    db.add(job)
    db.commit()
    db.refresh(search_query)
    db.refresh(job)

    background_tasks.add_task(
        run_import_job_async,
        job_id=job.id,
        project_id=project_id,
        search_query_id=search_query.id,
        query_string=payload.query_string,
        filters=filters_dict,
        mailto=project.mailto,
        max_records=payload.max_records,
    )

    return _to_search_query_read(search_query, job)


@router.get("/search-queries", response_model=list[schemas.SearchQueryRead])
def list_search_queries(project_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    search_queries = (
        db.query(models.SearchQuery)
        .filter_by(project_id=project_id)
        .order_by(models.SearchQuery.created_at.desc())
        .all()
    )
    return [_to_search_query_read(sq, sq.import_job) for sq in search_queries]


@router.get("/records", response_model=schemas.RecordListResponse)
def list_records(
    project_id: int,
    search_query_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=200),
    db: Session = Depends(get_db),
):
    _get_project(project_id, db)
    q = db.query(models.Record).filter_by(project_id=project_id)
    if search_query_id is not None:
        q = q.join(models.Record.found_by_queries).filter(models.SearchQuery.id == search_query_id)
    total = q.count()
    items = (
        q.order_by(models.Record.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.RecordListResponse(total=total, page=page, page_size=page_size, items=items)
