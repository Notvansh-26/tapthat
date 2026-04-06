from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import WaterSystem, Violation, ContaminantResult, GeographicArea
from app.schemas.water import (
    ZipCodeReport,
    WaterSystemSummary,
    ViolationOut,
    ContaminantOut,
)


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
        # Find water systems serving this ZIP
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

        # Build system summaries
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

        # Top contaminants (most recent, highest exceedance)
        top_contaminants = (
            self.db.query(ContaminantResult)
            .filter(ContaminantResult.pwsid.in_(pwsids))
            .order_by(ContaminantResult.exceedance_ratio.desc().nullslast())
            .limit(10)
            .all()
        )

        # Recent violations
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
        county: str | None = None,
        risk: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[WaterSystemSummary]:
        query = self.db.query(WaterSystem).filter(
            WaterSystem.activity_status == "Active"
        )
        if county:
            query = query.filter(WaterSystem.counties_served.ilike(f"%{county}%"))

        systems = query.offset(offset).limit(limit).all()

        results = [
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

        if risk:
            results = [r for r in results if r.risk_level == risk]

        return results

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

    def get_map_data(self) -> list[dict]:
        systems = (
            self.db.query(WaterSystem)
            .filter(
                WaterSystem.activity_status == "Active",
                WaterSystem.latitude.isnot(None),
                WaterSystem.longitude.isnot(None),
            )
            .all()
        )
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
