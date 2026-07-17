from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, field_validator
from typing import Optional
from database import SessionLocal
from models import Invoice, Brand , Shop, BrandInvoice, ShopInvoice, LedgerEntry
from validation import validate_invoice
from ocr import extract_text_from_image
from extraction import extract_from_printed_text, extract_from_handwritten_image
from ledger import (
    record_payment, record_remittance, get_brand_balance,
    get_shop_balance, record_brand_invoice_entry, record_shop_invoice_entry
)
import shutil
import os

load_dotenv()

app = FastAPI(title="KhataFlow")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BrandCreate(BaseModel):
    name: str
    gstin: str = None
    commission_rate: float = 0.0

class ShopCreate(BaseModel):
    name: str
    gstin: str = None
    location: str = None

class PaymentCreate(BaseModel):
    shop_id: int
    amount: float
    notes: str = None
    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v

class RemittanceCreate(BaseModel):
    brand_id: int
    sale_amount: float
    notes: str = None
    @field_validator("sale_amount")
    @classmethod
    def sale_amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Sale amount must be greater than 0")
        return v

class BrandInvoiceCreate(BaseModel):
    brand_id: int
    invoice_number: str
    invoice_date: str
    amount: float


class ShopInvoiceCreate(BaseModel):
    shop_id: int
    invoice_number: str
    invoice_date: str
    amount: float

class InvoiceUpdate(BaseModel):
    extracted_data: dict

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/upload-invoice")
async def upload_invoice(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    party_type: Optional[str] = Form(None),   # "brand" or "shop"
    party_id: Optional[int] = Form(None)
):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        if doc_type == "handwritten":
            raw_text = None
            try:
                extracted_data = extract_from_handwritten_image(temp_path)
            except json_lib.JSONDecodeError:
                return {"error": "Could not read structured data from this document. Try a clearer photo."}
        else:
            raw_text = extract_text_from_image(temp_path)
            try:
                extracted_data = extract_from_printed_text(raw_text)
            except json_lib.JSONDecodeError:
                return {"error": "Could not read structured data from this document. Try a clearer scan."}

        db = SessionLocal()
        status, reason = validate_invoice(extracted_data, db, Invoice)

        invoice = Invoice(
            filename=file.filename,
            raw_ocr_text=raw_text,
            extracted_data=extracted_data,
            validation_status=status,
            validation_reason=reason,
            party_type=party_type,
            party_id=party_id
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)

        # If valid AND linked to a party, automatically create the ledger-driving record
        if status == "valid" and party_type and party_id:
            amount = extracted_data.get("total_amount")
            invoice_number = extracted_data.get("invoice_number")
            invoice_date = extracted_data.get("invoice_date")

            if party_type == "brand":
                brand_inv = BrandInvoice(
                    brand_id=party_id, invoice_number=invoice_number,
                    invoice_date=invoice_date, amount=amount
                )
                db.add(brand_inv)
                db.commit()
                db.refresh(brand_inv)
                record_brand_invoice_entry(db, brand_inv)
                invoice.linked_brand_invoice_id = brand_inv.id

            elif party_type == "shop":
                shop_inv = ShopInvoice(
                    shop_id=party_id, invoice_number=invoice_number,
                    invoice_date=invoice_date, amount=amount
                )
                db.add(shop_inv)
                db.commit()
                db.refresh(shop_inv)
                record_shop_invoice_entry(db, shop_inv)
                invoice.linked_shop_invoice_id = shop_inv.id

            db.commit()
            db.refresh(invoice)

        db.close()

        return {
            "invoice_id": invoice.id,
            "doc_type": doc_type,
            "extracted_data": extracted_data,
            "validation_status": status,
            "validation_reason": reason,
            "linked_to_ledger": bool(invoice.linked_brand_invoice_id or invoice.linked_shop_invoice_id)
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/brands")
def create_brand(brand: BrandCreate):
    db = SessionLocal()
    new_brand = Brand(**brand.dict())
    db.add(new_brand)
    db.commit()
    db.refresh(new_brand)
    db.close()
    return new_brand

@app.post("/shops")
def create_shop(shop: ShopCreate):
    db = SessionLocal()
    new_shop = Shop(**shop.dict())
    db.add(new_shop)
    db.commit()
    db.refresh(new_shop)
    db.close()
    return new_shop

@app.get("/brands")
def list_brands():
    db = SessionLocal()
    brands = db.query(Brand).all()
    db.close()
    return brands

@app.get("/shops")
def list_shops():
    db = SessionLocal()
    shops = db.query(Shop).all()
    db.close()
    return shops

@app.post("/payments")
def create_payment(payment: PaymentCreate):
    db = SessionLocal()
    result = record_payment(db, payment.shop_id, payment.amount, payment.notes)
    db.close()
    return result


@app.post("/remittances")
def create_remittance(remittance: RemittanceCreate):
    db = SessionLocal()
    result = record_remittance(db, remittance.brand_id, remittance.sale_amount, remittance.notes)
    db.close()
    return result


@app.get("/brands/{brand_id}/balance")
def brand_balance(brand_id: int):
    db = SessionLocal()
    balance = get_brand_balance(db, brand_id)
    db.close()
    return {"brand_id": brand_id, "balance_owed": balance}


@app.get("/shops/{shop_id}/balance")
def shop_balance(shop_id: int):
    db = SessionLocal()
    balance = get_shop_balance(db, shop_id)
    db.close()
    return {"shop_id": shop_id, "balance_owed": balance}

@app.post("/brand-invoices")
def create_brand_invoice(inv: BrandInvoiceCreate):
    db = SessionLocal()

    existing = db.query(BrandInvoice).filter(
        BrandInvoice.brand_id == inv.brand_id,
        BrandInvoice.invoice_number == inv.invoice_number
    ).first()
    if existing:
        db.close()
        return {"error": f"Invoice {inv.invoice_number} already exists for this brand", "existing_id": existing.id}

    new_inv = BrandInvoice(**inv.dict())
    db.add(new_inv)
    db.commit()
    db.refresh(new_inv)
    record_brand_invoice_entry(db, new_inv)
    db.refresh(new_inv)
    db.close()
    return new_inv


@app.post("/shop-invoices")
def create_shop_invoice(inv: ShopInvoiceCreate):
    db = SessionLocal()

    existing = db.query(ShopInvoice).filter(
        ShopInvoice.shop_id == inv.shop_id,
        ShopInvoice.invoice_number == inv.invoice_number
    ).first()
    if existing:
        db.close()
        return {"error": f"Invoice {inv.invoice_number} already exists for this shop", "existing_id": existing.id}

    new_inv = ShopInvoice(**inv.dict())
    db.add(new_inv)
    db.commit()
    db.refresh(new_inv)
    record_shop_invoice_entry(db, new_inv)
    db.refresh(new_inv)
    db.close()
    return new_inv

@app.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: int, update: InvoiceUpdate):
    db = SessionLocal()
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        db.close()
        return {"error": "Invoice not found"}

    invoice.extracted_data = update.extracted_data
    status, reason = validate_invoice(update.extracted_data, db, Invoice, exclude_id=invoice_id)
    invoice.validation_status = status
    invoice.validation_reason = reason
    db.commit()

    # Newly valid AND has a linked party AND not already linked to ledger
    already_linked = invoice.linked_brand_invoice_id or invoice.linked_shop_invoice_id
    if status == "valid" and invoice.party_type and invoice.party_id and not already_linked:
        amount = update.extracted_data.get("total_amount")
        invoice_number = update.extracted_data.get("invoice_number")
        invoice_date = update.extracted_data.get("invoice_date")

        if invoice.party_type == "brand":
            brand_inv = BrandInvoice(brand_id=invoice.party_id, invoice_number=invoice_number,
                                       invoice_date=invoice_date, amount=amount)
            db.add(brand_inv)
            db.commit()
            db.refresh(brand_inv)
            record_brand_invoice_entry(db, brand_inv)
            invoice.linked_brand_invoice_id = brand_inv.id
        elif invoice.party_type == "shop":
            shop_inv = ShopInvoice(shop_id=invoice.party_id, invoice_number=invoice_number,
                                     invoice_date=invoice_date, amount=amount)
            db.add(shop_inv)
            db.commit()
            db.refresh(shop_inv)
            record_shop_invoice_entry(db, shop_inv)
            invoice.linked_shop_invoice_id = shop_inv.id

        db.commit()

    db.refresh(invoice)
    db.close()

    return {
        "invoice_id": invoice.id,
        "extracted_data": invoice.extracted_data,
        "validation_status": status,
        "validation_reason": reason
    }

@app.get("/brands/{brand_id}/transactions")
def brand_transactions(brand_id: int):
    db = SessionLocal()
    entries = db.query(LedgerEntry).filter(
        LedgerEntry.party_type == "brand",
        LedgerEntry.party_id == brand_id
    ).order_by(LedgerEntry.date.desc()).all()
    db.close()
    return [
        {"id": e.id, "type": e.entry_type, "amount": e.amount, "description": e.description, "date": e.date}
        for e in entries
    ]


@app.get("/shops/{shop_id}/transactions")
def shop_transactions(shop_id: int):
    db = SessionLocal()
    entries = db.query(LedgerEntry).filter(
        LedgerEntry.party_type == "shop",
        LedgerEntry.party_id == shop_id
    ).order_by(LedgerEntry.date.desc()).all()
    db.close()
    return [
        {"id": e.id, "type": e.entry_type, "amount": e.amount, "description": e.description, "date": e.date}
        for e in entries
    ]