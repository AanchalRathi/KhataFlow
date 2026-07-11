from fastapi import FastAPI, UploadFile, File
from dotenv import load_dotenv
from database import SessionLocal
from models import Invoice
from ocr import extract_text_from_image
from extraction import extract_invoice_fields
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
async def upload_invoice(file: UploadFile = File(...)):
    # temp save the uploaded file
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # OCR
    raw_text = extract_text_from_image(temp_path)

    # Gemini extraction
    extracted_data = extract_invoice_fields(raw_text)

    # save to DB
    db = SessionLocal()
    invoice = Invoice(
        filename=file.filename,
        raw_ocr_text=raw_text,
        extracted_data=extracted_data
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    db.close()

    os.remove(temp_path)

    return {
        "invoice_id": invoice.id,
        "extracted_data": extracted_data
    }