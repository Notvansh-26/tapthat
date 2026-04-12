from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_

from app.models import WaterSystem, Violation, ContaminantResult, GeographicArea
from app.schemas.water import (
    ZipCodeReport,
    WaterSystemSummary,
    ViolationOut,
    ContaminantOut,
)

try:
    import pgeocode
    _nominatim = pgeocode.Nominatim("us")
except Exception:
    _nominatim = None


def _lookup_county_state(zip_code: str) -> tuple[str, str] | None:
    """Return (county, state_code) for a US ZIP code, or None if unknown."""
    if _nominatim is None:
        return None
    try:
        row = _nominatim.query_postal_code(zip_code)
        county = row.get("county_name") if hasattr(row, "get") else getattr(row, "county_name", None)
        state = row.get("state_code") if hasattr(row, "get") else getattr(row, "state_code", None)
        if county and state and str(county) != "nan":
            # pgeocode county names often include " County" suffix — strip it
            county_clean = str(county).replace(" County", "").replace(" Parish", "").strip()
            return county_clean, str(state).strip()
    except Exception:
        pass
    return None

# State code → full name mapping
STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
    "AS": "American Samoa", "GU": "Guam", "MP": "Northern Mariana Islands",
    "PR": "Puerto Rico", "VI": "U.S. Virgin Islands",
}


def _calc_risk_level(system: WaterSystem) -> str:
    """Risk level logic — like weather severity ratings."""
    if system.serious_violator or system.health_violation_count_3yr >= 3:
        return "danger"
    if system.violation_count_3yr > 0 or system.health_violation_count_3yr > 0:
        return "caution"
    return "safe"


def _overall_risk(systems: list[WaterSystem]) -> str:
    """Worst risk across all systems serving a ZIP — conservative approach."""
    risks = [_calc_risk_level(s) for s in systems]
    if "danger" in risks:
        return "danger"
    if "caution" in risks:
        return "caution"
    return "safe"


class WaterService:
    def __init__(self, db: Session):
        self.db = db

    def get_zip_report(self, zip_code: str) -> ZipCodeReport | None:
        # Primary: find water systems serving this ZIP via geographic_areas table
        geo_areas = (
            self.db.query(GeographicArea)
            .filter(GeographicArea.zip_code == zip_code)
            .all()
        )
        pwsids = list({g.pwsid for g in geo_areas})

        # Fallback: SDWIS geographic_area coverage is sparse (~58% for TX, etc.)
        # Use pgeocode to resolve ZIP → county + state, then match by counties_served.
        if not pwsids:
            location = _lookup_county_state(zip_code)
            if location:
                county, state_code = location
                systems = (
                    self.db.query(WaterSystem)
                    .filter(
                        WaterSystem.state_code == state_code,
                        WaterSystem.activity_status == "Active",
                        WaterSystem.counties_served.ilike(f"%{county}%"),
                    )
                    .all()
                )
                if not systems:
                    return None
                # Build synthetic summaries directly — skip geo_areas join
                system_summaries = [
                    WaterSystemSummary(
                        pwsid=s.pwsid,
                        name=s.name,
                        primary_source=s.primary_source,
                        system_type=s.system_type,
                        population_served=s.population_served,
                        counties_served=s.counties_served,
                        serious_violator=s.serious_violator or False,
                        violation_count_3yr=s.violation_count_3yr or 0,
                        health_violation_count_3yr=s.health_violation_count_3yr or 0,
                        risk_level=_calc_risk_level(s),
                    )
                    for s in systems
                ]
                fallback_pwsids = [s.pwsid for s in systems]
                top_contaminants = (
                    self.db.query(ContaminantResult)
                    .filter(ContaminantResult.pwsid.in_(fallback_pwsids))
                    .order_by(ContaminantResult.exceedance_ratio.desc().nullslast())
                    .limit(10)
                    .all()
                )
                recent_violations = (
                    self.db.query(Violation)
                    .filter(Violation.pwsid.in_(fallback_pwsids))
                    .order_by(Violation.compliance_begin_date.desc().nullslast())
                    .limit(20)
                    .all()
                )
                total_pop = sum(s.population_served or 0 for s in systems)
                return ZipCodeReport(
                    zip_code=zip_code,
                    water_systems=system_summaries,
                    total_population_served=total_pop,
                    overall_risk_level=_overall_risk(systems),
                    top_contaminants=[ContaminantOut.model_validate(c) for c in top_contaminants],
                    recent_violations=[ViolationOut.model_validate(v) for v in recent_violations],
                )
            return None

        systems = (
            self.db.query(WaterSystem)
            .filter(WaterSystem.pwsid.in_(pwsids))
            .all()
        )
        if not systems:
            return None

        system_summaries = [
            WaterSystemSummary(
                pwsid=s.pwsid,
                name=s.name,
                primary_source=s.primary_source,
                system_type=s.system_type,
                population_served=s.population_served,
                counties_served=s.counties_served,
                serious_violator=s.serious_violator or False,
                violation_count_3yr=s.violation_count_3yr or 0,
                health_violation_count_3yr=s.health_violation_count_3yr or 0,
                risk_level=_calc_risk_level(s),
            )
            for s in systems
        ]

        top_contaminants = (
            self.db.query(ContaminantResult)
            .filter(ContaminantResult.pwsid.in_(pwsids))
            .order_by(ContaminantResult.exceedance_ratio.desc().nullslast())
            .limit(10)
            .all()
        )

        recent_violations = (
            self.db.query(Violation)
            .filter(Violation.pwsid.in_(pwsids))
            .order_by(Violation.compliance_begin_date.desc().nullslast())
            .limit(20)
            .all()
        )

        total_pop = sum(s.population_served or 0 for s in systems)

        return ZipCodeReport(
            zip_code=zip_code,
            water_systems=system_summaries,
            total_population_served=total_pop,
            overall_risk_level=_overall_risk(systems),
            top_contaminants=[ContaminantOut.model_validate(c) for c in top_contaminants],
            recent_violations=[ViolationOut.model_validate(v) for v in recent_violations],
        )

    def list_systems(
        self,
        state: str | None = None,
        county: str | None = None,
        risk: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[WaterSystemSummary]:
        query = self.db.query(WaterSystem).filter(
            WaterSystem.activity_status == "Active"
        )
        if state:
            query = query.filter(WaterSystem.state_code == state.upper())
        if county:
            query = query.filter(WaterSystem.counties_served.ilike(f"%{county}%"))

        # Apply risk filter at DB level to avoid pagination issues
        if risk == "danger":
            from sqlalchemy import or_
            query = query.filter(
                or_(
                    WaterSystem.serious_violator == True,
                    WaterSystem.health_violation_count_3yr >= 3,
                )
            )
        elif risk == "caution":
            query = query.filter(
                WaterSystem.serious_violator != True,
                WaterSystem.health_violation_count_3yr < 3,
                (WaterSystem.violation_count_3yr > 0) | (WaterSystem.health_violation_count_3yr > 0),
            )
        elif risk == "safe":
            query = query.filter(
                WaterSystem.serious_violator != True,
                WaterSystem.violation_count_3yr == 0,
                WaterSystem.health_violation_count_3yr == 0,
            )

        systems = query.offset(offset).limit(limit).all()

        return [
            WaterSystemSummary(
                pwsid=s.pwsid,
                name=s.name,
                primary_source=s.primary_source,
                system_type=s.system_type,
                population_served=s.population_served,
                counties_served=s.counties_served,
                serious_violator=s.serious_violator or False,
                violation_count_3yr=s.violation_count_3yr or 0,
                health_violation_count_3yr=s.health_violation_count_3yr or 0,
                risk_level=_calc_risk_level(s),
            )
            for s in systems
        ]

    def get_contaminants(self, pwsid: str) -> list[ContaminantOut]:
        results = (
            self.db.query(ContaminantResult)
            .filter(ContaminantResult.pwsid == pwsid)
            .order_by(ContaminantResult.sample_date.desc().nullslast())
            .all()
        )
        return [ContaminantOut.model_validate(r) for r in results]

    def get_violation_history(self, pwsid: str) -> list[ViolationOut]:
        results = (
            self.db.query(Violation)
            .filter(Violation.pwsid == pwsid)
            .order_by(Violation.compliance_begin_date.asc().nullslast())
            .all()
        )
        return [ViolationOut.model_validate(v) for v in results]

    def get_state_risks(self) -> list[dict]:
        """Aggregate risk data per state for the national map — single SQL GROUP BY."""
        rows = (
            self.db.query(
                WaterSystem.state_code,
                func.count(WaterSystem.pwsid).label("system_count"),
                func.coalesce(func.sum(WaterSystem.population_served), 0).label("population"),
                func.coalesce(func.sum(WaterSystem.violation_count_3yr), 0).label("violation_count"),
                func.bool_or(WaterSystem.serious_violator).label("has_serious"),
                func.coalesce(func.max(WaterSystem.health_violation_count_3yr), 0).label("max_health_violations"),
                func.coalesce(func.sum(WaterSystem.violation_count_3yr), 0).label("total_violations"),
            )
            .filter(
                WaterSystem.activity_status == "Active",
                WaterSystem.state_code.isnot(None),
            )
            .group_by(WaterSystem.state_code)
            .all()
        )

        results = []
        for row in rows:
            if row.has_serious or row.max_health_violations >= 3:
                risk_level = "danger"
            elif row.total_violations > 0 or row.max_health_violations > 0:
                risk_level = "caution"
            else:
                risk_level = "safe"

            results.append({
                "state_code": row.state_code,
                "state_name": STATE_NAMES.get(row.state_code, row.state_code),
                "risk_level": risk_level,
                "system_count": row.system_count,
                "population": row.population,
                "violation_count": row.violation_count,
            })

        results.sort(key=lambda r: r["population"], reverse=True)
        return results

    def get_county_risks(self, state_code: str) -> list[dict]:
        """Aggregate risk data per county for a specific state."""
        state_upper = state_code.upper()

        # Fetch only the columns we need — avoids loading all model fields
        rows = (
            self.db.query(
                WaterSystem.counties_served,
                WaterSystem.population_served,
                WaterSystem.violation_count_3yr,
                WaterSystem.health_violation_count_3yr,
                WaterSystem.serious_violator,
            )
            .filter(
                WaterSystem.activity_status == "Active",
                WaterSystem.state_code == state_upper,
                WaterSystem.counties_served.isnot(None),
            )
            .all()
        )

        # Build county → ZIP mapping in a single distinct query
        county_zips: dict[str, set[str]] = {}
        geo_rows = (
            self.db.query(GeographicArea.county_served, GeographicArea.zip_code)
            .filter(
                GeographicArea.state_code == state_upper,
                GeographicArea.county_served.isnot(None),
                GeographicArea.zip_code.isnot(None),
            )
            .distinct()
            .all()
        )
        for county_name, zip_code in geo_rows:
            key = county_name.strip().upper()
            county_zips.setdefault(key, set()).add(zip_code.strip()[:5])

        county_data: dict[str, dict] = {}
        for counties_served, population, violation_count, health_violations, serious in rows:
            pop = population or 0
            viols = violation_count or 0
            health = health_violations or 0
            is_danger = bool(serious) or health >= 3
            is_caution = not is_danger and (viols > 0 or health > 0)

            for county in (c.strip() for c in counties_served.split(",") if c.strip()):
                key = county.upper()
                if key not in county_data:
                    county_data[key] = {
                        "county": county.title(),
                        "system_count": 0,
                        "population": 0,
                        "violation_count": 0,
                        "has_danger": False,
                        "has_caution": False,
                    }
                entry = county_data[key]
                entry["system_count"] += 1
                entry["population"] += pop
                entry["violation_count"] += viols
                if is_danger:
                    entry["has_danger"] = True
                elif is_caution:
                    entry["has_caution"] = True

        results = []
        for county_upper, entry in county_data.items():
            risk_level = "danger" if entry["has_danger"] else "caution" if entry["has_caution"] else "safe"
            results.append({
                "county": entry["county"],
                "risk_level": risk_level,
                "system_count": entry["system_count"],
                "population": entry["population"],
                "violation_count": entry["violation_count"],
                "zip_codes": sorted(county_zips.get(county_upper, set())),
            })

        results.sort(key=lambda r: r["population"], reverse=True)
        return results

    def get_map_data(self, state_code: str | None = None) -> list[dict]:
        query = self.db.query(WaterSystem).filter(
            WaterSystem.activity_status == "Active",
            WaterSystem.latitude.isnot(None),
            WaterSystem.longitude.isnot(None),
        )
        if state_code:
            query = query.filter(WaterSystem.state_code == state_code.upper())

        systems = query.all()
        return [
            {
                "pwsid": s.pwsid,
                "name": s.name,
                "lat": s.latitude,
                "lng": s.longitude,
                "population": s.population_served,
                "risk_level": _calc_risk_level(s),
            }
            for s in systems
        ]
