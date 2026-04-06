"""
EPA Data Ingestion Pipeline for Texas Water Quality

Fetches data from:
1. EPA ECHO SDW API — water systems, violations, compliance
2. EPA Envirofacts SDWIS API — geographic areas (ZIP mapping), violation details

Run: python -m scripts.ingest_epa_data
"""

import json
import httpx
import time
import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text
from app.database import engine, Base
from app.models import WaterSystem, Violation, ContaminantResult, GeographicArea

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load official EPA contaminant code reference (870 codes)
_ref_path = Path(__file__).resolve().parent.parent / "app" / "data" / "epa_contaminant_codes.json"
with open(_ref_path) as f:
    EPA_CONTAMINANT_CODES = json.load(f)
logger.info(f"Loaded {len(EPA_CONTAMINANT_CODES)} EPA contaminant codes")

ECHO_BASE = "https://echodata.epa.gov/echo/sdw_rest_services"
SDWIS_BASE = "https://data.epa.gov/efservice"

CONTAMINANT_INFO = {
    # Inorganics
    "1005": {"name": "Arsenic", "mcl": 0.010, "mclg": 0.0, "category": "Inorganic", "unit": "mg/L"},
    "1006": {"name": "Asbestos", "mcl": 7.0, "mclg": 7.0, "category": "Inorganic", "unit": "MFL"},
    "1007": {"name": "Cadmium", "mcl": 0.005, "mclg": 0.005, "category": "Inorganic", "unit": "mg/L"},
    "1008": {"name": "Chromium", "mcl": 0.1, "mclg": 0.1, "category": "Inorganic", "unit": "mg/L"},
    "1009": {"name": "Mercury", "mcl": 0.002, "mclg": 0.002, "category": "Inorganic", "unit": "mg/L"},
    "1010": {"name": "Barium", "mcl": 2.0, "mclg": 2.0, "category": "Inorganic", "unit": "mg/L"},
    "1011": {"name": "Antimony", "mcl": 0.006, "mclg": 0.006, "category": "Inorganic", "unit": "mg/L"},
    "1012": {"name": "Beryllium", "mcl": 0.004, "mclg": 0.004, "category": "Inorganic", "unit": "mg/L"},
    "1013": {"name": "Cyanide", "mcl": 0.2, "mclg": 0.2, "category": "Inorganic", "unit": "mg/L"},
    "1015": {"name": "Selenium", "mcl": 0.05, "mclg": 0.05, "category": "Inorganic", "unit": "mg/L"},
    "1016": {"name": "Thallium", "mcl": 0.002, "mclg": 0.0005, "category": "Inorganic", "unit": "mg/L"},
    "1024": {"name": "Fluoride", "mcl": 4.0, "mclg": 4.0, "category": "Inorganic", "unit": "mg/L"},
    "1025": {"name": "Nickel", "mcl": None, "mclg": None, "category": "Inorganic", "unit": "mg/L"},
    "1030": {"name": "Nitrate", "mcl": 10.0, "mclg": 10.0, "category": "Inorganic", "unit": "mg/L"},
    "1035": {"name": "Nitrite", "mcl": 1.0, "mclg": 1.0, "category": "Inorganic", "unit": "mg/L"},
    "1036": {"name": "Nitrate-Nitrite", "mcl": 10.0, "mclg": 10.0, "category": "Inorganic", "unit": "mg/L"},
    # Lead and Copper
    "1038": {"name": "Lead", "mcl": 0.015, "mclg": 0.0, "category": "Lead and Copper", "unit": "mg/L"},
    "1040": {"name": "Copper", "mcl": 1.3, "mclg": 1.3, "category": "Lead and Copper", "unit": "mg/L"},
    # Radiologicals
    "1017": {"name": "Combined Uranium", "mcl": 0.030, "mclg": 0.0, "category": "Radiological", "unit": "mg/L"},
    "1018": {"name": "Gross Alpha", "mcl": 15.0, "mclg": 0.0, "category": "Radiological", "unit": "pCi/L"},
    "1020": {"name": "Combined Radium", "mcl": 5.0, "mclg": 0.0, "category": "Radiological", "unit": "pCi/L"},
    # Microbiological
    "2039": {"name": "Total Coliform", "mcl": 0.0, "mclg": 0.0, "category": "Microbiological", "unit": "presence"},
    "2900": {"name": "Turbidity", "mcl": None, "mclg": None, "category": "Microbiological", "unit": "NTU"},
    "2901": {"name": "E. coli", "mcl": 0.0, "mclg": 0.0, "category": "Microbiological", "unit": "presence"},
    # Disinfection Byproducts
    "2050": {"name": "Total Haloacetic Acids (HAA5)", "mcl": 0.060, "mclg": None, "category": "Disinfection Byproducts", "unit": "mg/L"},
    "2065": {"name": "Total Trihalomethanes (TTHM)", "mcl": 0.080, "mclg": None, "category": "Disinfection Byproducts", "unit": "mg/L"},
    "2076": {"name": "Chlorite", "mcl": 1.0, "mclg": 0.8, "category": "Disinfection Byproducts", "unit": "mg/L"},
    "2077": {"name": "Bromate", "mcl": 0.010, "mclg": 0.0, "category": "Disinfection Byproducts", "unit": "mg/L"},
    # Physical
    "0100": {"name": "Turbidity", "mcl": 1.0, "mclg": None, "category": "Physical", "unit": "NTU"},
}

# Extended code-to-name mapping for violation contaminant codes (no MCL needed)
CONTAMINANT_CODE_NAMES = {
    "1000": "Inorganic Chemicals (IOC) Rule",
    "2000": "Volatile Organic Chemicals (VOC) Rule",
    "2300": "Synthetic Organic Chemicals (SOC) Rule",
    "2400": "Unregulated Contaminant Monitoring Rule",
    "2500": "Consumer Confidence Report Rule",
    "2600": "Public Notification Rule",
    "2700": "Recordkeeping/Reporting Rule",
    "2800": "Other Monitoring Rule",
    "2950": "Disinfection Byproducts Rule",
    "2985": "Stage 1 D/DBPR",
    "2990": "Stage 2 D/DBPR",
    "3000": "Total Coliform Rule",
    "3001": "Total Coliform (TCR)",
    "3014": "Total Coliform (RTCR)",
    "3013": "E. coli (RTCR)",
    "3100": "Revised Total Coliform Rule",
    "4000": "Treatment Technique Rule",
    "4100": "Lead and Copper Rule",
    "5000": "Monitoring & Reporting Violation",
    "5001": "IOC Monitoring Violation",
    "5002": "VOC Monitoring Violation",
    "5003": "SOC Monitoring Violation",
    "5004": "Radiological Monitoring Violation",
    "5100": "SWTR Monitoring Violation",
    "5200": "D/DBPR Monitoring Violation",
    "5300": "Lead & Copper Monitoring Violation",
    "5400": "Coliform Monitoring Violation",
    "5500": "RTCR Monitoring Violation",
    "6000": "Operations & Maintenance Violation",
    "7000": "Public Notice Violation",
    "7500": "Consumer Confidence Report Violation",
    "8000": "Operator Certification Violation",
    "8500": "Record Keeping Violation",
    "9000": "Other Violation",
}

# Reusable HTTP client (connection pooling)
client = httpx.Client(timeout=60.0)


def fetch_with_retry(url: str, params: dict = None, retries: int = 3) -> dict | list | None:
    for attempt in range(retries):
        try:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            logger.warning(f"Attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    logger.error(f"All retries failed for {url}")
    return None


ALL_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
    "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
    "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
    "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
    "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI",
    "WY", "AS", "GU", "MP", "PR", "VI",
]


def bulk_upsert_systems(conn, rows: list[dict]):
    """Bulk insert water systems using raw SQL for speed."""
    if not rows:
        return
    conn.execute(
        text("""
            INSERT INTO water_systems (pwsid, state_code, name, primary_source, system_type,
                population_served, counties_served, owner_type, activity_status,
                latitude, longitude, serious_violator, violation_count_3yr,
                health_violation_count_3yr, last_updated)
            VALUES (:pwsid, :state_code, :name, :primary_source, :system_type,
                :population_served, :counties_served, :owner_type, :activity_status,
                :latitude, :longitude, :serious_violator, :violation_count_3yr,
                :health_violation_count_3yr, :last_updated)
            ON CONFLICT (pwsid) DO UPDATE SET
                name = EXCLUDED.name,
                state_code = EXCLUDED.state_code,
                population_served = EXCLUDED.population_served,
                serious_violator = EXCLUDED.serious_violator,
                violation_count_3yr = EXCLUDED.violation_count_3yr,
                health_violation_count_3yr = EXCLUDED.health_violation_count_3yr,
                last_updated = EXCLUDED.last_updated
        """),
        rows,
    )


def ingest_water_systems(conn, state_code: str = "TX"):
    logger.info(f"Fetching {state_code} water systems from ECHO...")

    data = fetch_with_retry(
        f"{ECHO_BASE}.get_systems",
        params={"p_st": state_code, "p_ptype": "CWS", "p_act": "A", "output": "JSON"},
    )
    if not data:
        logger.error("Failed to fetch water systems")
        return

    qid = data.get("Results", {}).get("QueryID")
    total = int(data.get("Results", {}).get("QueryRows", 0))
    logger.info(f"Found {total} systems (QID: {qid})")

    page = 1
    page_size = 100
    count = 0
    now = datetime.now(timezone.utc)

    while count < total:
        page_data = fetch_with_retry(
            f"{ECHO_BASE}.get_qid",
            params={"qid": qid, "pageno": page, "pagesize": page_size, "output": "JSON"},
        )
        if not page_data:
            break

        systems = page_data.get("Results", {}).get("WaterSystems", [])
        if not systems:
            break

        rows = []
        for fac in systems:
            pwsid = (fac.get("PWSId") or "").strip()
            if not pwsid:
                continue
            rows.append({
                "pwsid": pwsid,
                "state_code": state_code,
                "name": (fac.get("PWSName") or "").strip(),
                "primary_source": fac.get("PrimarySourceCode"),
                "system_type": fac.get("PWSTypeCode", "CWS"),
                "population_served": _safe_int(fac.get("PopulationServedCount")),
                "counties_served": fac.get("CountiesServed"),
                "owner_type": fac.get("OwnerDesc"),
                "activity_status": "Active",
                "latitude": _safe_float(fac.get("RegistryLat")),
                "longitude": _safe_float(fac.get("RegistryLon")),
                "serious_violator": fac.get("SNCFlag", "N") == "Y",
                "violation_count_3yr": _safe_int(fac.get("ViolationCount")) or 0,
                "health_violation_count_3yr": _safe_int(fac.get("HealthFlag")) or 0,
                "last_updated": now,
            })

        bulk_upsert_systems(conn, rows)
        conn.commit()
        count += len(rows)
        logger.info(f"  {count}/{total} systems")
        page += 1
        time.sleep(0.3)

    logger.info(f"Ingested {count} {state_code} water systems")


def ingest_geographic_areas(conn, state_code: str = "TX"):
    logger.info(f"Fetching {state_code} ZIP code mappings from SDWIS...")

    batch_size = 1000
    offset = 1
    total = 0

    while True:
        end = offset + batch_size - 1
        data = fetch_with_retry(
            f"{SDWIS_BASE}/sdwis.geographic_area/primacy_agency_code/equals/{state_code}/{offset}:{end}/json"
        )
        if not data or len(data) == 0:
            break

        rows = []
        for row in data:
            pwsid = (row.get("pwsid") or "").strip()
            zip_code = (row.get("zip_code_served") or "").strip()
            if not pwsid or not zip_code:
                continue
            rows.append({
                "pwsid": pwsid,
                "zip_code": zip_code[:5],
                "county_served": row.get("county_served"),
                "city_served": row.get("city_served"),
                "state_code": state_code,
            })

        if rows:
            conn.execute(
                text("""
                    INSERT INTO geographic_areas (pwsid, zip_code, county_served, city_served, state_code)
                    VALUES (:pwsid, :zip_code, :county_served, :city_served, :state_code)
                """),
                rows,
            )
            conn.commit()
        total += len(rows)
        logger.info(f"  {total} geographic areas")

        if len(data) < batch_size:
            break
        offset += batch_size
        time.sleep(0.3)

    logger.info(f"Ingested {total} {state_code} geographic area mappings")


def ingest_violations(conn, state_code: str = "TX"):
    logger.info(f"Fetching {state_code} violations from SDWIS...")

    result = conn.execute(text("SELECT pwsid FROM water_systems"))
    known_pwsids = {r[0] for r in result}
    logger.info(f"  {len(known_pwsids)} known systems")

    batch_size = 1000
    offset = 1
    total = 0
    skipped = 0

    while True:
        end = offset + batch_size - 1
        data = fetch_with_retry(
            f"{SDWIS_BASE}/sdwis.violation/primacy_agency_code/equals/{state_code}/{offset}:{end}/json"
        )
        if not data or len(data) == 0:
            break

        rows = []
        for row in data:
            pwsid = (row.get("pwsid") or "").strip()
            if pwsid not in known_pwsids:
                skipped += 1
                continue
            rows.append({
                "pwsid": pwsid,
                "violation_id": row.get("violation_id"),
                "contaminant_code": row.get("contaminant_code"),
                "contaminant_name": _get_contaminant_name(row.get("contaminant_code")),
                "rule_name": row.get("rule_name"),
                "violation_type": row.get("violation_type"),
                "severity": row.get("severity"),
                "is_health_based": row.get("is_health_based_ind", "N") == "Y",
                "compliance_begin_date": _parse_date(row.get("compl_per_begin_date")),
                "compliance_end_date": _parse_date(row.get("compl_per_end_date")),
                "enforcement_action": row.get("enforcement_action"),
            })

        if rows:
            conn.execute(
                text("""
                    INSERT INTO violations (pwsid, violation_id, contaminant_code, contaminant_name,
                        rule_name, violation_type, severity, is_health_based,
                        compliance_begin_date, compliance_end_date, enforcement_action)
                    VALUES (:pwsid, :violation_id, :contaminant_code, :contaminant_name,
                        :rule_name, :violation_type, :severity, :is_health_based,
                        :compliance_begin_date, :compliance_end_date, :enforcement_action)
                """),
                rows,
            )
            conn.commit()
        total += len(rows)
        logger.info(f"  {total} violations ({skipped} skipped)")

        if len(data) < batch_size:
            break
        offset += batch_size
        time.sleep(0.3)

    logger.info(f"Ingested {total} {state_code} violations (skipped {skipped} orphans)")


def ingest_lcr_samples(conn, state_code: str = "TX"):
    logger.info(f"Fetching {state_code} Lead/Copper samples from SDWIS...")

    result = conn.execute(text("SELECT pwsid FROM water_systems"))
    known_pwsids = {r[0] for r in result}

    batch_size = 1000
    offset = 1
    total = 0
    skipped = 0

    while True:
        end = offset + batch_size - 1
        data = fetch_with_retry(
            f"{SDWIS_BASE}/sdwis.lcr_sample_result/primacy_agency_code/equals/{state_code}/{offset}:{end}/json"
        )
        if not data or len(data) == 0:
            break

        rows = []
        for row in data:
            pwsid = (row.get("pwsid") or "").strip()
            if pwsid not in known_pwsids:
                skipped += 1
                continue
            code = (row.get("contaminant_code") or "").strip()
            info = CONTAMINANT_INFO.get(code, {})
            value = _safe_float(row.get("sample_measure"))
            mcl = info.get("mcl")

            rows.append({
                "pwsid": pwsid,
                "contaminant_code": code,
                "contaminant_name": info.get("name", f"Unknown ({code})"),
                "category": info.get("category", "Lead and Copper"),
                "measurement_value": value,
                "unit": info.get("unit", "mg/L"),
                "mcl": mcl,
                "mclg": info.get("mclg"),
                "sample_date": _parse_date(row.get("sample_date")),
                "sample_type": row.get("sample_type_code"),
                "exceedance_ratio": round(value / mcl, 3) if value and mcl else None,
            })

        if rows:
            conn.execute(
                text("""
                    INSERT INTO contaminant_results (pwsid, contaminant_code, contaminant_name,
                        category, measurement_value, unit, mcl, mclg, sample_date,
                        sample_type, exceedance_ratio)
                    VALUES (:pwsid, :contaminant_code, :contaminant_name,
                        :category, :measurement_value, :unit, :mcl, :mclg, :sample_date,
                        :sample_type, :exceedance_ratio)
                """),
                rows,
            )
            conn.commit()
        total += len(rows)
        logger.info(f"  {total} LCR samples ({skipped} skipped)")

        if len(data) < batch_size:
            break
        offset += batch_size
        time.sleep(0.3)

    logger.info(f"Ingested {total} {state_code} LCR samples (skipped {skipped} orphans)")


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
    code = code.strip()
    # Check detailed CONTAMINANT_INFO first (has MCL data)
    info = CONTAMINANT_INFO.get(code)
    if info:
        return info["name"]
    # Fall back to extended code-to-name mapping
    name = CONTAMINANT_CODE_NAMES.get(code)
    if name:
        return name
    # Fall back to official EPA reference (870 codes)
    return EPA_CONTAMINANT_CODES.get(code)


# --- Main ---

def ingest_state(conn, state_code: str):
    """Run full ingestion pipeline for a single state."""
    logger.info(f"--- Ingesting {state_code} ---")
    ingest_water_systems(conn, state_code)
    ingest_geographic_areas(conn, state_code)
    ingest_violations(conn, state_code)
    ingest_lcr_samples(conn, state_code)
    logger.info(f"--- {state_code} complete ---")


def run_full_ingestion(states: list[str] | None = None):
    states = states or ALL_STATES
    logger.info("=" * 60)
    logger.info(f"TapThat EPA Data Ingestion — {len(states)} state(s)")
    logger.info("=" * 60)

    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        for i, state_code in enumerate(states, 1):
            logger.info(f"\n[{i}/{len(states)}] Processing {state_code}")
            try:
                ingest_state(conn, state_code)
            except Exception as e:
                logger.error(f"Failed to ingest {state_code}: {e}")
                continue
            if len(states) > 1:
                time.sleep(1)  # Rate limit between states

    logger.info("=" * 60)
    logger.info("Ingestion complete!")
    logger.info("=" * 60)
    client.close()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # Usage: python -m scripts.ingest_epa_data TX CA NY
        # Or:   python -m scripts.ingest_epa_data --all
        if sys.argv[1] == "--all":
            run_full_ingestion(ALL_STATES)
        else:
            run_full_ingestion([s.upper() for s in sys.argv[1:]])
    else:
        # Default: all states
        run_full_ingestion(ALL_STATES)
