from fastapi import FastAPI, UploadFile, File, Form
from dotenv import load_dotenv
from pydantic import BaseModel
from database import SessionLocal
from models import Invoice, Brand , Shop
from validation import validate_invoice
from ocr import extract_text_from_image
from extraction import extract_from_printed_text, extract_from_handwritten_image
from ledger import (
    record_payment, record_remittance,
    get_brand_balance, get_shop_balance
)
import shutil
import os

load_dotenv()

app = FastAPI(title="KhataFlow")

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


class RemittanceCreate(BaseModel):
    brand_id: int
    sale_amount: float
    notes: str = None

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/upload-invoice")
async def upload_invoice(file: UploadFile = File(...),doc_type: str = Form(...)):
    # temp save the uploaded file
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # OCR
    try:
        if doc_type == "handwritten":
            raw_text = None
            extracted_data = extract_from_handwritten_image(temp_path)
        else:
            raw_text = extract_text_from_image(temp_path)
            extracted_data = extract_from_printed_text(raw_text)

        db = SessionLocal()
        status, reason = validate_invoice(extracted_data, db, Invoice)

        invoice = Invoice(
            filename=file.filename,
            raw_ocr_text=raw_text,
            extracted_data=extracted_data,
            validation_status=status,
            validation_reason=reason
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        db.close()

        return {
            "invoice_id": invoice.id,
            "doc_type": doc_type,
            "extracted_data": extracted_data,
            "validation_status": status,
            "validation_reason": reason
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