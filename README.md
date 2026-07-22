# KhataFlow

An AI-assisted ledger and reconciliation tool for commission-based distribution businesses — built for a real clothing distribution business coordinating 20+ brands and 80+ shops.

## The problem

Small distribution businesses in India often track supplier and buyer accounts manually. A business owner selling products from multiple brands to multiple shops needs to track: what's owed to each brand, what's due from each shop, commission earned on each sale, and whether purchase records match what suppliers report to the GST portal. This is normally done by hand or in loose spreadsheets — slow and error-prone, especially as the number of counterparties grows.

## What it does

- **Document extraction**: Upload printed invoices or handwritten bilty/challan documents. Tesseract OCR handles printed text; Google Gemini's vision model reads handwritten documents directly, since OCR engines cannot reliably read handwriting.
- **Deterministic validation**: Every extracted invoice is checked against a real GSTIN checksum algorithm and tax arithmetic (including IGST for interstate sales) before it's trusted. Extracted data is never taken at face value — it's a candidate that must pass validation, not an authority.
- **Editable corrections**: Flagged invoices (bad GSTIN, tax mismatch, duplicate) show editable fields so incorrect OCR reads can be corrected and re-validated without re-uploading.
- **Automatic ledger linking**: A valid invoice, once tied to a specific brand or shop at upload time, automatically creates the corresponding ledger record — no manual double-entry required.
- **Two-sided ledger**: Tracks brand and shop balances using an append-only ledger design — balances are always derived by summing entries, never stored as a mutable value, to preserve a full audit trail.
- **Payment matching**: Incoming shop payments are matched against outstanding invoices (FIFO), with partial payment and overpayment handling.
- **Commission calculation**: Automatically splits an incoming sale amount into commission retained and the amount owed to the brand.
- **Transaction history**: Every brand and shop has a drill-down view of its full transaction history — every invoice, payment, and remittance that makes up its current balance.
- **Deletion with cascading cleanup**: Brands and shops can be removed along with their associated invoices and ledger history.

## Why these design choices

- **Deterministic validation over LLM trust**: extracted fields never enter the ledger without passing GSTIN checksum and tax arithmetic checks — the model's output is a candidate, not an authority. This was a deliberate response to seeing LLM-extracted data (especially from handwriting) come back with plausible but occasionally wrong values.
- **Append-only ledger**: modeled after real accounting systems, not a mutable balance column, specifically to avoid lost updates and preserve a full audit trail. Every balance shown is a derived sum, not a stored number that could silently drift from reality.
- **Document-type-aware extraction**: a generic "invoice" schema initially produced null fields on bilty/challan documents during testing, since a transport receipt has an entirely different structure (consignor/consignee, freight, weight) than a tax invoice. This led to building separate extraction schemas per document type rather than forcing one schema to fit everything.
- **Cost-conscious OCR routing**: printed documents go through free local OCR (Tesseract) first, with only the extracted text sent to the LLM for structuring — the image itself is only sent to the LLM when handwriting makes local OCR unreliable.

## Tech stack

**Backend**: FastAPI, SQLAlchemy, PostgreSQL (Neon)
**OCR/AI**: Tesseract (printed documents), Google Gemini API via `google-genai` SDK (handwritten documents, structured field extraction)
**Frontend**: React (Vite), custom minimalist design system inspired by physical ledger books

## Screenshots

1. **Upload & Review** — a printed invoice successfully extracted, showing the "Valid" badge and populated fields<img width="1872" height="647" alt="image" src="https://github.com/user-attachments/assets/27899e9b-366f-44bb-9221-686eeec8bc82" /> <img width="967" height="846" alt="image" src="https://github.com/user-attachments/assets/6b4dc581-8266-4cad-b60e-b1894beac6c9" />

2. **Upload & Review (flagged)** — an invoice flagged for a duplicate or validation issue, with editable fields visible <img width="1088" height="807" alt="image" src="https://github.com/user-attachments/assets/7d900f78-4dfe-4d60-869b-3caf8048f8b5" />

3. **Ledger dashboard** — the summary cards (owed to brands / due from shops) and balance list <img width="1837" height="853" alt="image" src="https://github.com/user-attachments/assets/29714b7b-f364-4d59-bef3-07e3924e128f" />

4. **Ledger drill-down** — the "View all" transaction history modal open for a specific brand or shop <img width="1110" height="505" alt="image" src="https://github.com/user-attachments/assets/a24969b7-6748-4672-82ca-eede31c2c088" />

5. **Brands & Shops** — the management page with a brand and shop added <img width="1122" height="622" alt="image" src="https://github.com/user-attachments/assets/ba9fef15-6fb6-40de-861c-2987b372a8ca" /> <img width="1062" height="586" alt="image" src="https://github.com/user-attachments/assets/bd74b365-a136-4c02-8391-fe38d3105a7a" />

6. **Payments & Remittances** — the commission-split result shown after sending a remittance <img width="1066" height="603" alt="image" src="https://github.com/user-attachments/assets/a398fbe1-29fc-479b-b7ca-ab16fc2f5d17" />


## Setup

### Backend
\`\`\`bash
-python -m venv venv
-venv\Scripts\Activate.ps1   # Windows
-pip install -r requirements.txt
-add a .env file with DATABASE_URL and GEMINI_API_KEY
-python init_db.py
-uvicorn main:app --reload
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

## Current status

**Working and tested end-to-end:**
- Document extraction — printed (Tesseract) and handwritten (Gemini vision), including IGST-aware tax validation
- Deterministic validation layer — GSTIN checksum, tax arithmetic, duplicate detection
- Editable correction flow for flagged invoices, with re-validation on save
- Invoice-to-ledger linking — a valid, party-tagged upload automatically creates the ledger entry
- Two-sided ledger — brand and shop balances, payment matching (FIFO), commission-split remittances
- Transaction history drill-down per brand/shop
- Delete functionality for brands and shops, with cascading cleanup of their invoices and ledger entries
- Full React frontend across all core pages, wired to the backend

**Built but not yet fully verified:**
- GSTR-2B reconciliation — backend logic complete, pending a real GSTR-2B export to test the parser against

**Not yet built:**
- Authentication
- Deployment (currently runs locally only — backend on `localhost:8000`, frontend on `localhost:5173`)
- Delete functionality for individual invoices, payments, and remittances (currently only brands/shops)
- Migration tooling (Alembic) — schema changes during development were applied via manual table resets
- Automatic document-type detection (printed vs. handwritten is currently a manual selection at upload)

