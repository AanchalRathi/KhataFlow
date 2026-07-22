from google import genai
from google.genai.errors import ServerError
import os
import json
from dotenv import load_dotenv
from PIL import Image, ImageOps

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

EXTRACTION_PROMPT = """
You are extracting structured data from a {doc_type}.
Return ONLY valid JSON, no markdown formatting, no explanation.

Extract these fields:
- vendor_name (string)
- vendor_gstin (string, 15 characters, if present)
- invoice_number (string)
- invoice_date (string, YYYY-MM-DD format if possible)
- taxable_value (number)
- cgst_rate (number, percentage)
- cgst_amount (number)
- sgst_rate (number, percentage)
- sgst_amount (number)
- igst_rate (number, percentage)
- igst_amount (number)
- total_amount (number)
- line_items (array of objects with: description, hsn_code, quantity, amount)

If a field is not found or illegible, use null.
If handwriting is unclear on a field, still provide your best guess.

{content_section}
"""

def extract_from_printed_text(raw_text: str) -> dict:
    """For Tesseract-extracted text from printed invoices"""
    prompt = EXTRACTION_PROMPT.format(
        doc_type="printed invoice",
        content_section=f"Raw OCR text:\n{raw_text}"
    )
    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt
        )
    except ServerError:
        raise ValueError("The AI service is temporarily busy. Please try again in a minute.")
    cleaned = response.text.strip().replace("```json", "").replace("```", "")
    return json.loads(cleaned)


def extract_from_handwritten_image(image_path: str) -> dict:
    """For handwritten bilty/challan — sends image directly to Gemini"""
    image = Image.open(image_path)
    image = ImageOps.exif_transpose(image) 
    prompt = EXTRACTION_PROMPT.format(
        doc_type="handwritten bilty/challan document",
        content_section="Read the handwritten content directly from the attached image."
    )
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=[prompt, image]
    )
    cleaned = response.text.strip().replace("```json", "").replace("```", "")
    return json.loads(cleaned)