import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-2.5-flash")

def extract_invoice_fields(raw_text: str) -> dict:
    prompt = f"""
You are extracting structured data from an invoice's raw OCR text.
Return ONLY valid JSON, no markdown formatting, no explanation.

Extract these fields:
- vendor_name (string)
- vendor_gstin (string, 15 characters)
- invoice_number (string)
- invoice_date (string, YYYY-MM-DD format if possible)
- taxable_value (number)
- cgst_rate (number, percentage)
- cgst_amount (number)
- sgst_rate (number, percentage)
- sgst_amount (number)
- total_amount (number)
- line_items (array of objects with: description, hsn_code, quantity, amount)

If a field is not found, use null.

Raw OCR text:
{raw_text}
"""
    response = model.generate_content(prompt)
    cleaned = response.text.strip().replace("```json", "").replace("```", "")
    return json.loads(cleaned)
