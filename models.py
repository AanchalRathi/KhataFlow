from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from datetime import datetime
from database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    raw_ocr_text = Column(String)
    extracted_data = Column(JSON)          # structured JSON from Gemini
    validation_status = Column(String, default="pending")  # pending / valid / flagged
    validation_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)