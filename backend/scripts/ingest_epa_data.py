"""
EPA Data Ingestion Pipeline for Texas Water Quality

Fetches data from:
1. EPA ECHO SDW API — water systems, violations, compliance
2. EPA Envirofacts SDWIS API — geographic areas (ZIP mapping), violation details
3. ECHO Bulk Downloads — Lead/Copper sample results

Run: python -m scripts.ingest_epa_data
"""

import httpx
import time
import logging
from datetime import datetime

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models import WaterSystem, Violation, ContaminantResult, GeographicArea

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

ECHO_BASE = "https://echodata.epa.gov/echo/sdw_rest_services"
SDWIS_BASE = "https://data.epa.gov/efservice"

# Common contaminant codes and their readable names + MCLs (mg/L unless noted)
CONTAMINANT_INFO = {
    "1005": {"name": "Arsenic", "mcl": 0.010, "mclg": 0.0, "category": "Inorganic", "unit": "mg/L"},
    "1010": {"name": "Barium", "mcl": 2.0, "mclg": 2.0, "category": "Inorganic", "unit": "mg/L"},
    "1024": {"name": "Fluoride", "mcl": 4.0, "mclg": 4.0, "category": "Inorganic", "unit": "mg/L"},
    "1030": {"name": "Nitrate", "mcl": 10.0, "mclg": 10.0, "category": "Inorganic", "unit": "mg/L"},
    "1035": {"name": "Nitrite", "mcl": 1.0, "mclg": 1.0, "category": "Inorganic", "unit": "mg/L"},
    "1038": {"name": "Lead", "mcl": 0.015, "mclg": 0.0, "category": "Lead and Copper", "unit": "mg/L"},
    "1040": {"name": "Copper", "mcl": 1.3, "mclg": 1.3, "category": "Lead and Copper", "unit": "mg/L"},
    "2039": {"name": "Total Coliform", "mcl": 0.0, "mclg": 0.0, "category": "Microbiological", "unit": "presence"},
    "2050": {"name": "Total Haloacetic Acids (HAA5)", "mcl": 0.060, "mclg": None, "category": "Disinfection Byproducts", "unit": "mg/L"},
    "2065": {"name": "Total Trihalomethanes (TTHM)", "mcl": 0.080, "mclg": None, "category": "Disinfection Byproducts", "unit": "mg/L"},
    "0100": {"name": "Turbidity", "mcl": 1.0, "mclg": None, "category": "Physical", "unit": "NTU"},
}


def fetch_with_retry(url: str, params: dict = None, retries: int = 3) -> dict | list | None:
    """Fetch URL with retry logic and rate limiting."""
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=60.0) as client:
                resp = client.get(url, params=params)
                resp.raise_for_status()
                return resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    logger.error(f"All retries failed for {url}")
    return None


def ingest_water_systems(db: Session):
    """Fetch all TX water systems from ECHO SDW API."""
    logger.info("Fetching TX water systems from ECHO...")

    # Step 1: get_systems to get a QID
    data = fetch_with_retry(
        f"{ECHO_BASE}.get_systems",
        params={"p_st": "TX", "p_ptype": "CWS", "p_act": "A", "output": "JSON"},
    )
    if not data:
        logger.error("Failed to fetch water systems")
        return

    qid = data.get("Results", {}).get("QueryID")
    total = int(data.get("Results", {}).get("QueryRows", 0))
    logger.info(f"Found {total} active community water systems in TX (QID: {qid})")

    # Step 2: paginate through results
    page = 1
    page_size = 100
    count = 0

    while count < total:
        page_data = fetch_with_retry(
            f"{ECHO_BASE}.get_qid",
            params={"qid": qid, "pageno": page, "pagesize": page_size, "output": "JSON"},
        )
        if not page_data:
            break

        facilities = page_data.get("Results", {}).get("Facilities", [])
        if not facilities:
            break

        for fac in facilities:
            system = WaterSystem(
                pwsid=fac.get("PWSId", "").strip(),
                name=fac.get("PWSName", "").strip(),
                primary_source=fac.get("PrimarySourceCode"),
                system_type=fac.get("PWSTypeCode", "CWS"),
                population_served=_safe_int(fac.get("PopulationServedCount")),
                counties_served=fac.get("CountiesServed"),
                owner_type=fac.get("OwnerDesc"),
                activity_status="Active",
                latitude=_safe_float(fac.get("RegistryLat")),
                longitude=_safe_float(fac.get("RegistryLon")),
                serious_violator=fac.get("SNCFlag", "N") == "Y",
                violation_count_3yr=_safe_int(fac.get("ViolationCount")),
                health_violation_count_3yr=_safe_int(fac.get("HealthFlag")),
                last_updated=datetime.utcnow(),
            )
            db.merge(system)
            count += 1

        db.commit()
        logger.info(f"  Processed {count}/{total} systems")
        page += 1
        time.sleep(0.5)  # Be nice to EPA servers

    logger.info(f"Ingested {count} water systems")


def ingest_geographic_areas(db: Session):
    """Fetch ZIP code mappings from SDWIS geographic_area table."""
    logger.info("Fetching ZIP code mappings from SDWIS...")

    batch_size = 1000
    offset = 1
    total = 0

    while True:
        end = offset + batch_size - 1
        data = fetch_with_retry(
            f"{SDWIS_BASE}/sdwis.geographic_area/state_code/equals/TX/{offset}:{end}/json"
        )
        if not data or len(data) == 0:
            break

        for row in data:
            pwsid = row.get("pwsid", "").strip()
            zip_code = row.get("zip_code", "").strip()
            if not pwsid or not zip_code:
                continue

            geo = GeographicArea(
                pwsid=pwsid,
                zip_code=zip_code[:5],  # Normalize to 5-digit
                county_served=row.get("county_served"),
                city_served=row.get("city_served"),
                state_code="TX",
            )
            db.merge(geo)
            total += 1

        db.commit()
        logger.info(f"  Processed {total} geographic area records")

        if len(data) < batch_size:
            break
        offset += batch_size
        time.sleep(0.5)

    logger.info(f"Ingested {total} geographic area mappings")


def ingest_violations(db: Session):
    """Fetch TX violations from SDWIS."""
    logger.info("Fetching TX violations from SDWIS...")

    batch_size = 1000
    offset = 1
    total = 0

    while True:
        end = offset + batch_size - 1
        data = fetch_with_retry(
            f"{SDWIS_BASE}/sdwis.violation/primacy_agency_code/equals/TX/{offset}:{end}/json"
        )
        if not data or len(data) == 0:
            break

        for row in data:
            violation = Violation(
                pwsid=row.get("pwsid", "").strip(),
                violation_id=row.get("violation_id"),
                contaminant_code=row.get("contaminant_code"),
                contaminant_name=_get_contaminant_name(row.get("contaminant_code")),
                rule_name=row.get("rule_name"),
                violation_type=row.get("violation_type"),
                severity=row.get("severity"),
                is_health_based=row.get("is_health_based_ind", "N") == "Y",
                compliance_begin_date=_parse_date(row.get("compl_per_begin_date")),
                compliance_end_date=_parse_date(row.get("compl_per_end_date")),
                enforcement_action=row.get("enforcement_action"),
            )
            db.add(violation)
            total += 1

        db.commit()
        logger.info(f"  Processed {total} violation records")

        if len(data) < batch_size:
            break
        offset += batch_size
        time.sleep(0.5)

    logger.info(f"Ingested {total} violations")


def ingest_lcr_samples(db: Session):
    """Fetch Lead and Copper Rule sample results from SDWIS."""
    logger.info("Fetching Lead/Copper sample results from SDWIS...")

    batch_size = 1000
    offset = 1
    total = 0

    while True:
        end = offset + batch_size - 1
        data = fetch_with_retry(
            f"{SDWIS_BASE}/sdwis.lcr_sample_result/primacy_agency_code/equals/TX/{offset}:{end}/json"
        )
        if not data or len(data) == 0:
            break

        for row in data:
            code = row.get("contaminant_code", "").strip()
            info = CONTAMINANT_INFO.get(code, {})
            value = _safe_float(row.get("sample_measure"))
            mcl = info.get("mcl")

            result = ContaminantResult(
                pwsid=row.get("pwsid", "").strip(),
                contaminant_code=code,
                contaminant_name=info.get("name", f"Unknown ({code})"),
                category=info.get("category", "Lead and Copper"),
                measurement_value=value,
                unit=info.get("unit", "mg/L"),
                mcl=mcl,
                mclg=info.get("mclg"),
                sample_date=_parse_date(row.get("sample_date")),
                sample_type=row.get("sample_type_code"),
                exceedance_ratio=round(value / mcl, 3) if value and mcl else None,
            )
            db.add(result)
            total += 1

        db.commit()
        logger.info(f"  Processed {total} LCR sample records")

        if len(data) < batch_size:
            break
        offset += batch_size
        time.sleep(0.5)

    logger.info(f"Ingested {total} LCR samples")


# --- Helpers ---

def _safe_int(val) -> int | None:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _parse_date(val) -> datetime | None:
    if not val:
        return None
    for fmt in ("%Y-%m-%d", "%d-%b-%y", "%m/%d/%Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(val.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return None


def _get_contaminant_name(code: str | None) -> str | None:
    if not code:
        return None
    info = CONTAMINANT_INFO.get(code.strip())
    return info["name"] if info else None


# --- Main ---

def run_full_ingestion():
    """Run the complete data ingestion pipeline."""
    logger.info("=" * 60)
    logger.info("TapThat EPA Data Ingestion — Texas")
    logger.info("=" * 60)

    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        ingest_water_systems(db)
        ingest_geographic_areas(db)
        ingest_violations(db)
        ingest_lcr_samples(db)
        logger.info("=" * 60)
        logger.info("Ingestion complete!")
        logger.info("=" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    run_full_ingestion()
