from pydantic import BaseModel
from datetime import datetime


class WaterSystemSummary(BaseModel):
    pwsid: str
    name: str
    primary_source: str | None
    system_type: str | None
    population_served: int | None
    counties_served: str | None
    serious_violator: bool
    violation_count_3yr: int
    health_violation_count_3yr: int
    risk_level: str  # safe, caution, danger

    class Config:
        from_attributes = True


class ViolationOut(BaseModel):
    violation_id: str | None
    contaminant_name: str | None
    rule_name: str | None
    violation_type: str | None
    severity: str | None
    is_health_based: bool
    compliance_begin_date: datetime | None
    compliance_end_date: datetime | None

    class Config:
        from_attributes = True


class ContaminantOut(BaseModel):
    contaminant_name: str | None
    category: str | None
    measurement_value: float | None
    unit: str | None
    mcl: float | None
    mclg: float | None
    sample_date: datetime | None
    exceedance_ratio: float | None

    class Config:
        from_attributes = True


class ZipCodeReport(BaseModel):
    zip_code: str
    water_systems: list[WaterSystemSummary]
    total_population_served: int
    overall_risk_level: str  # safe, caution, danger
    top_contaminants: list[ContaminantOut]
    recent_violations: list[ViolationOut]


class ComparisonReport(BaseModel):
    zip_codes: list[str]
    reports: list[ZipCodeReport]
