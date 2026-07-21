from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, field_validator
from typing import Optional
from database import SessionLocal
from models import Invoice, Brand, Shop, BrandInvoice, ShopInvoice, LedgerEntry, Payment, Remittance
from validation import validate_invoice
from ocr import extract_text_from_image
from extraction import extract_from_printed_text, extract_from_handwritten_image
from ledger import (
    record_payment, record_remittance, get_brand_balance,
    get_shop_balance, record_brand_invoice_entry, record_shop_invoice_entry
)
import json as json_lib
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
    gstin: Optional[str] = None
    commission_rate: float = 0.0

class ShopCreate(BaseModel):
    name: str
    gstin: Optional[str] = None
    location: Optional[str] = None

class PaymentCreate(BaseModel):
    shop_id: int
    amount: float
    notes: Optional[str] = None
    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v

class RemittanceCreate(BaseModel):
    brand_id: int
    sale_amount: float
    notes: Optional[str] = None
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
    party_type: Optional[str] = Form(None),  
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

    db.refresh(invoice)
    db.close()

    return {
        "invoice_id": invoice.id,
        "extracted_data": invoice.extracted_data,
        "validation_status": status,
        "validation_reason": reason
    }

@app.post("/invoices/{invoice_id}/confirm")
def confirm_invoice_to_ledger(invoice_id: int):
    db = SessionLocal()
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        db.close()
        return {"error": "Invoice not found"}

    if invoice.linked_brand_invoice_id or invoice.linked_shop_invoice_id:
        db.close()
        return {"error": "Already added to ledger"}

    if not invoice.party_type or not invoice.party_id:
        db.close()
        return {"error": "No brand or shop selected for this invoice"}

    extracted_data = invoice.extracted_data
    amount = extracted_data.get("total_amount")
    invoice_number = extracted_data.get("invoice_number")
    invoice_date = extracted_data.get("invoice_date")

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
        "linked_to_ledger": True
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
        {"id": e.id, "type": e.entry_type, "amount": e.amount, "description": e.description,
        "date": e.date, "reference_id": e.reference_id}
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
        {"id": e.id, "type": e.entry_type, "amount": e.amount, "description": e.description,
        "date": e.date, "reference_id": e.reference_id}
        for e in entries
    ]

@app.delete("/brands/{brand_id}")
def delete_brand(brand_id: int):
    db = SessionLocal()
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        db.close()
        return {"error": "Brand not found"}
    db.query(LedgerEntry).filter(LedgerEntry.party_type == "brand", LedgerEntry.party_id == brand_id).delete()
    db.query(BrandInvoice).filter(BrandInvoice.brand_id == brand_id).delete()
    db.query(Remittance).filter(Remittance.brand_id == brand_id).delete()
    db.delete(brand)
    db.commit()
    db.close()
    return {"deleted": True, "brand_id": brand_id}


@app.delete("/shops/{shop_id}")
def delete_shop(shop_id: int):
    db = SessionLocal()
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        db.close()
        return {"error": "Shop not found"}
    db.query(LedgerEntry).filter(LedgerEntry.party_type == "shop", LedgerEntry.party_id == shop_id).delete()
    db.query(ShopInvoice).filter(ShopInvoice.shop_id == shop_id).delete()
    db.query(Payment).filter(Payment.shop_id == shop_id).delete()
    db.delete(shop)
    db.commit()
    db.close()
    return {"deleted": True, "shop_id": shop_id}


@app.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int):
    db = SessionLocal()
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        db.close()
        return {"error": "Invoice not found"}
    if invoice.linked_brand_invoice_id:
        db.query(LedgerEntry).filter(
            LedgerEntry.entry_type == "invoice",
            LedgerEntry.reference_id == invoice.linked_brand_invoice_id
        ).delete()
        db.query(BrandInvoice).filter(BrandInvoice.id == invoice.linked_brand_invoice_id).delete()

    if invoice.linked_shop_invoice_id:
        db.query(LedgerEntry).filter(
            LedgerEntry.entry_type == "invoice",
            LedgerEntry.reference_id == invoice.linked_shop_invoice_id
        ).delete()
        db.query(ShopInvoice).filter(ShopInvoice.id == invoice.linked_shop_invoice_id).delete()
    db.delete(invoice)
    db.commit()
    db.close()
    return {"deleted": True, "invoice_id": invoice_id}

@app.delete("/payments/{payment_id}")
def delete_payment(payment_id: int):
    db = SessionLocal()
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        db.close()
        return {"error": "Payment not found"}

    # Remove the matching ledger entry too
    db.query(LedgerEntry).filter(
        LedgerEntry.entry_type == "payment",
        LedgerEntry.reference_id == payment_id
    ).delete()
    db.delete(payment)
    db.commit()
    db.close()
    return {"deleted": True, "payment_id": payment_id}


@app.delete("/remittances/{remittance_id}")
def delete_remittance(remittance_id: int):
    db = SessionLocal()
    remittance = db.query(Remittance).filter(Remittance.id == remittance_id).first()
    if not remittance:
        db.close()
        return {"error": "Remittance not found"}

    db.query(LedgerEntry).filter(
        LedgerEntry.entry_type == "remittance",
        LedgerEntry.reference_id == remittance_id
    ).delete()
    db.delete(remittance)
    db.commit()
    db.close()
    return {"deleted": True, "remittance_id": remittance_id}

@app.delete("/ledger-invoices/{party_type}/{reference_id}")
def delete_ledger_invoice(party_type: str, reference_id: int):
    db = SessionLocal()

    db.query(LedgerEntry).filter(
        LedgerEntry.entry_type == "invoice",
        LedgerEntry.reference_id == reference_id,
        LedgerEntry.party_type == party_type
    ).delete()

    if party_type == "brand":
        brand_inv = db.query(BrandInvoice).filter(BrandInvoice.id == reference_id).first()
        if not brand_inv:
            db.close()
            return {"error": "Invoice not found"}
        # also clear the link from the original OCR Invoice record, if any
        db.query(Invoice).filter(Invoice.linked_brand_invoice_id == reference_id).update(
            {"linked_brand_invoice_id": None}
        )
        db.delete(brand_inv)

    elif party_type == "shop":
        shop_inv = db.query(ShopInvoice).filter(ShopInvoice.id == reference_id).first()
        if not shop_inv:
            db.close()
            return {"error": "Invoice not found"}
        db.query(Invoice).filter(Invoice.linked_shop_invoice_id == reference_id).update(
            {"linked_shop_invoice_id": None}
        )
        db.delete(shop_inv)

    else:
        db.close()
        return {"error": "Invalid party_type"}

    db.commit()
    db.close()
    return {"deleted": True}