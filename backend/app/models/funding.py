from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean, func
from ..database import Base

class FundingPeriod(Base):
    __tablename__ = "funding_periods"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)          # FY 2025/2026
    total_fund = Column(Numeric(14, 2), nullable=False)
    opening_date = Column(Date)
    closing_date = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())