from fastapi import FastAPI, UploadFile, File, Form
from dotenv import load_dotenv
from database import SessionLocal
from models import Invoice
from validation import validate_invoice
from ocr import extract_text_from_image
from extraction import extract_from_printed_text, extract_from_handwritten_image
import shutil
import os

load_dotenv()

app = FastAPI(title="KhataFlow")

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