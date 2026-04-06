from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ContaminantResult(Base):
    __tablename__ = "contaminant_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pwsid = Column(String(12), ForeignKey("water_systems.pwsid"), index=True)
    contaminant_code = Column(String(10), index=True)
    contaminant_name = Column(String(255))
    category = Column(String(100))  # e.g., Lead and Copper, Disinfectants, IOC, VOC
    measurement_value = Column(Float)
    unit = Column(String(50))
    mcl = Column(Float)  # Maximum Contaminant Level (legal limit)
    mclg = Column(Float)  # MCL Goal (health goal)
    sample_date = Column(DateTime)
    sample_type = Column(String(50))

    # Risk calculation
    exceedance_ratio = Column(Float)  # value / mcl — >1.0 means over legal limit

    water_system = relationship("WaterSystem", back_populates="contaminant_results")
