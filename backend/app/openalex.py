import httpx

from app import schemas

BASE_URL = "https://api.openalex.org/works"
SELECT_FIELDS = "id,doi,title,abstract_inverted_index,authorships,publication_year,primary_location,type"
MAX_PER_PAGE = 200


def reconstruct_abstract(inverted_index: dict[str, list[int]] | None) -> str | None:
    if not inverted_index:
        return None
    max_position = max(pos for positions in inverted_index.values() for pos in positions)
    words = [""] * (max_position + 1)
    for word, positions in inverted_index.items():
        for pos in positions:
            words[pos] = word
    return " ".join(words)


def build_filter_string(filters: "schemas.SearchFilters | None") -> str | None:
    if filters is None:
        return None
    parts = []
    if filters.from_publication_date:
        parts.append(f"from_publication_date:{filters.from_publication_date.isoformat()}")
    if filters.to_publication_date:
        parts.append(f"to_publication_date:{filters.to_publication_date.isoformat()}")
    if filters.work_types:
        parts.append("type:" + "|".join(filters.work_types))
    if filters.open_access_only:
        parts.append("open_access.is_oa:true")
    return ",".join(parts) if parts else None


def _base_params(query_string: str, filters: "schemas.SearchFilters | None", mailto: str | None) -> dict:
    params: dict = {"search": query_string}
    filter_string = build_filter_string(filters)
    if filter_string:
        params["filter"] = filter_string
    if mailto:
        params["mailto"] = mailto
    return params


async def count_works(query_string: str, filters: "schemas.SearchFilters | None", mailto: str | None) -> int:
    params = {**_base_params(query_string, filters, mailto), "per-page": 1}
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(BASE_URL, params=params)
        response.raise_for_status()
        return response.json()["meta"]["count"]


async def iter_works(
    query_string: str,
    filters: "schemas.SearchFilters | None",
    mailto: str | None,
    max_records: int = 200,
):
    """Yields pages of works (lists of dicts) until max_records is reached."""
    fetched = 0
    cursor = "*"
    base_params = _base_params(query_string, filters, mailto)

    async with httpx.AsyncClient(timeout=30) as client:
        while fetched < max_records:
            params = {
                **base_params,
                "per-page": min(MAX_PER_PAGE, max_records - fetched),
                "cursor": cursor,
                "select": SELECT_FIELDS,
            }
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            results = data["results"]
            if not results:
                break
            yield results
            fetched += len(results)
            cursor = data["meta"].get("next_cursor")
            if not cursor:
                break


def work_to_record_fields(work: dict) -> dict:
    primary_location = work.get("primary_location") or {}
    source = primary_location.get("source") or {}
    authors = [
        a["author"]["display_name"]
        for a in work.get("authorships", [])
        if a.get("author") and a["author"].get("display_name")
    ]
    return {
        "openalex_id": work.get("id"),
        "doi": work.get("doi"),
        "title": work.get("title"),
        "abstract": reconstruct_abstract(work.get("abstract_inverted_index")),
        "authors": authors,
        "publication_year": work.get("publication_year"),
        "venue": source.get("display_name"),
        "work_type": work.get("type"),
        "raw_data": work,
    }
