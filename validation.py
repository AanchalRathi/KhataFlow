def validate_gstin(gstin: str) -> tuple[bool, str]:
    """Real GSTIN checksum validation"""
    if not gstin or len(gstin) != 15:
        return False, "GSTIN must be 15 characters"

    gstin = gstin.upper()
    char_map = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    def char_value(c):
        return char_map.index(c)

    factor = 1
    total = 0
    for i in range(14):
        code_point = char_value(gstin[i])
        digit = factor * code_point
        digit = (digit // 36) + (digit % 36)
        total += digit
        factor = 2 if factor == 1 else 1

    check_code_point = (36 - (total % 36)) % 36
    expected_check_char = char_map[check_code_point]

    if gstin[14] != expected_check_char:
        return False, f"GSTIN checksum failed (expected last char '{expected_check_char}')"

    return True, "GSTIN valid"


def validate_tax_arithmetic(taxable_value: float, cgst_rate: float, cgst_amount: float,
                              sgst_rate: float, sgst_amount: float,igst_rate: float, igst_amount : float, total_amount: float) -> tuple[bool, str]:
    """Confirm tax math actually adds up"""
    if taxable_value is None or total_amount is None:
        return False, "Missing taxable value or total amount"

    expected_cgst = round(taxable_value * (cgst_rate or 0) / 100, 2)
    expected_sgst = round(taxable_value * (sgst_rate or 0) / 100, 2)
    expected_igst = round(taxable_value * (igst_rate or 0) / 100, 2)
    expected_total = round(taxable_value + expected_cgst + expected_sgst+ expected_igst, 2)

    tolerance = 1.0  # allow small rounding differences

    if igst_amount and abs(igst_amount - expected_igst) > tolerance:
        return False, f"IGST mismatch: expected ~{expected_igst}, got {igst_amount}"
    if cgst_amount and abs(cgst_amount - expected_cgst) > tolerance:
        return False, f"CGST mismatch: expected ~{expected_cgst}, got {cgst_amount}"

    if sgst_amount and abs(sgst_amount - expected_sgst) > tolerance:
        return False, f"SGST mismatch: expected ~{expected_sgst}, got {sgst_amount}"

    if abs(total_amount - expected_total) > tolerance:
        return False, f"Total mismatch: expected ~{expected_total}, got {total_amount}"

    return True, "Tax arithmetic valid"


def validate_invoice(extracted_data: dict, db_session, invoice_model, exclude_id: int = None) -> tuple[str, str]:
    reasons = []

    gstin = extracted_data.get("vendor_gstin")
    is_valid_gstin, gstin_msg = validate_gstin(gstin)
    if not is_valid_gstin:
        reasons.append(gstin_msg)

    is_valid_tax, tax_msg = validate_tax_arithmetic(
        extracted_data.get("taxable_value"),
        extracted_data.get("cgst_rate"), extracted_data.get("cgst_amount"),
        extracted_data.get("sgst_rate"), extracted_data.get("sgst_amount"),
        extracted_data.get("igst_rate"), extracted_data.get("igst_amount"),
        extracted_data.get("total_amount"),
    )
    if not is_valid_tax:
        reasons.append(tax_msg)

    invoice_number = extracted_data.get("invoice_number")
    vendor_gstin = extracted_data.get("vendor_gstin")
    if invoice_number and vendor_gstin:
        query = db_session.query(invoice_model).filter(
            invoice_model.extracted_data["invoice_number"].astext == invoice_number,
            invoice_model.extracted_data["vendor_gstin"].astext == vendor_gstin
        )
        if exclude_id is not None:
            query = query.filter(invoice_model.id != exclude_id)
        existing = query.first()
        if existing:
            reasons.append(f"Duplicate invoice: {invoice_number} from same vendor already exists")

    if reasons:
        return "flagged", "; ".join(reasons)
    return "valid", "All checks passed"