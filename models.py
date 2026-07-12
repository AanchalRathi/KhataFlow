from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    raw_ocr_text = Column(String)
    extracted_data = Column(JSONB)          # structured JSONB from Gemini
    validation_status = Column(String, default="pending")  # pending / valid / flagged
    validation_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    gstin = Column(String)
    commission_rate = Column(Float, default=0.0)  # percentage
    contact_info = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    gstin = Column(String, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BrandInvoice(Base):
    """Stock/goods received FROM a brand"""
    __tablename__ = "brand_invoices"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"))
    invoice_id = Column(Integer, ForeignKey("invoices.id"))  # links to OCR/extraction record
    invoice_number = Column(String)
    invoice_date = Column(String)
    amount = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    brand = relationship("Brand")


class ShopInvoice(Base):
    """Goods sold TO a shop"""
    __tablename__ = "shop_invoices"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    invoice_number = Column(String)
    invoice_date = Column(String)
    amount = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("Shop")


class Payment(Base):
    """Money received FROM a shop"""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    amount = Column(Float)
    date = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)

    shop = relationship("Shop")


class Remittance(Base):
    """Money paid TO a brand, after commission deducted"""
    __tablename__ = "remittances"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"))
    amount = Column(Float)
    commission_deducted = Column(Float)
    date = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)

    brand = relationship("Brand")


class LedgerEntry(Base):
    """
    Append-only source of truth. Never edited or deleted.
    Balances are always derived by summing entries, not stored directly.
    """
    __tablename__ = "ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    party_type = Column(String)  # "brand" or "shop"
    party_id = Column(Integer)   # brand_id or shop_id
    entry_type = Column(String)  # "invoice", "payment", "remittance"
    reference_id = Column(Integer)  # id of the BrandInvoice/ShopInvoice/Payment/Remittance
    amount = Column(Float)       # positive = owed to us / by us, negative = settled
    date = Column(DateTime, default=datetime.utcnow)
    description = Column(String, nullable=True)