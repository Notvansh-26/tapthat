from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pwsid = Column(String(12), ForeignKey("water_systems.pwsid"), index=True)
    violation_id = Column(String(30), index=True)
    contaminant_code = Column(String(10))
    contaminant_name = Column(String(255))
    rule_name = Column(String(255))
    violation_type = Column(String(100))
    severity = Column(String(50))
    is_health_based = Column(Boolean, default=False)
    compliance_begin_date = Column(DateTime)
    compliance_end_date = Column(DateTime)
    enforcement_action = Column(String(255))

    water_system = relationship("WaterSystem", back_populates="violations")
