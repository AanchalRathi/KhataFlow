import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import os

def extract_text_from_image(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        pages = convert_from_path(file_path, dpi=300)
        text = ""
        for page in pages:
            text += pytesseract.image_to_string(page)
        return text
    else:
        image = Image.open(file_path)
        return pytesseract.image_to_string(image)