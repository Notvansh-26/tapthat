from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import WaterSystem, Violation, ContaminantResult, GeographicArea
from app.schemas.water import (
    ZipCodeReport,
    WaterSystemSummary,
    ViolationOut,
    ContaminantOut,
)

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
        # Find water systems serving this ZIP (nationally unique)
        geo_areas = (
            self.db.query(GeographicArea)
            .filter(GeographicArea.zip_code == zip_code)
            .all()
        )
        if not geo_areas:
            return None

        pwsids = list({g.pwsid for g in geo_areas})
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
        """Aggregate risk data per state for the national map."""
        systems = (
            self.db.query(WaterSystem)
            .filter(
                WaterSystem.activity_status == "Active",
                WaterSystem.state_code.isnot(None),
            )
            .all()
        )

        state_data: dict[str, dict] = {}
        for s in systems:
            sc = s.state_code
            if sc not in state_data:
                state_data[sc] = {
                    "system_count": 0,
                    "population": 0,
                    "violation_count": 0,
                    "has_danger": False,
                    "has_caution": False,
                }
            entry = state_data[sc]
            entry["system_count"] += 1
            entry["population"] += s.population_served or 0
            entry["violation_count"] += s.violation_count_3yr or 0

            risk = _calc_risk_level(s)
            if risk == "danger":
                entry["has_danger"] = True
            elif risk == "caution":
                entry["has_caution"] = True

        results = []
        for sc, entry in state_data.items():
            if entry["has_danger"]:
                risk_level = "danger"
            elif entry["has_caution"]:
                risk_level = "caution"
            else:
                risk_level = "safe"

            results.append({
                "state_code": sc,
                "state_name": STATE_NAMES.get(sc, sc),
                "risk_level": risk_level,
                "system_count": entry["system_count"],
                "population": entry["population"],
                "violation_count": entry["violation_count"],
            })

        results.sort(key=lambda r: r["population"], reverse=True)
        return results

    def get_county_risks(self, state_code: str) -> list[dict]:
        """Aggregate risk data per county for a specific state."""
        state_upper = state_code.upper()
        systems = (
            self.db.query(WaterSystem)
            .filter(
                WaterSystem.activity_status == "Active",
                WaterSystem.state_code == state_upper,
                WaterSystem.counties_served.isnot(None),
            )
            .all()
        )

        # Build county → ZIP mapping
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
            if key not in county_zips:
                county_zips[key] = set()
            county_zips[key].add(zip_code.strip()[:5])

        county_data: dict[str, dict] = {}
        for s in systems:
            counties = [c.strip() for c in s.counties_served.split(",") if c.strip()]
            risk = _calc_risk_level(s)

            for county in counties:
                county_upper = county.upper()
                if county_upper not in county_data:
                    county_data[county_upper] = {
                        "county": county.title(),
                        "system_count": 0,
                        "population": 0,
                        "violation_count": 0,
                        "has_danger": False,
                        "has_caution": False,
                    }
                entry = county_data[county_upper]
                entry["system_count"] += 1
                entry["population"] += s.population_served or 0
                entry["violation_count"] += s.violation_count_3yr or 0

                if risk == "danger":
                    entry["has_danger"] = True
                elif risk == "caution":
                    entry["has_caution"] = True

        results = []
        for county_upper, entry in county_data.items():
            if entry["has_danger"]:
                risk_level = "danger"
            elif entry["has_caution"]:
                risk_level = "caution"
            else:
                risk_level = "safe"

            zips = sorted(county_zips.get(county_upper, set()))

            results.append({
                "county": entry["county"],
                "risk_level": risk_level,
                "system_count": entry["system_count"],
                "population": entry["population"],
                "violation_count": entry["violation_count"],
                "zip_codes": zips,
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
