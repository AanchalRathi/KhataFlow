from sqlalchemy.orm import Session
from models import Brand, Shop, ShopInvoice, BrandInvoice, Payment, Remittance, LedgerEntry
from datetime import datetime


def record_shop_invoice_entry(db: Session, shop_invoice: ShopInvoice):
    """When a shop invoice is created, log that the shop owes us this amount"""
    entry = LedgerEntry(
        party_type="shop",
        party_id=shop_invoice.shop_id,
        entry_type="invoice",
        reference_id=shop_invoice.id,
        amount=shop_invoice.amount,
        description=f"Invoice {shop_invoice.invoice_number} to shop"
    )
    db.add(entry)
    db.commit()
    return entry


def record_brand_invoice_entry(db: Session, brand_invoice: BrandInvoice):
    """When a brand invoice is received, log that we owe the brand this amount"""
    entry = LedgerEntry(
        party_type="brand",
        party_id=brand_invoice.brand_id,
        entry_type="invoice",
        reference_id=brand_invoice.id,
        amount=brand_invoice.amount,
        description=f"Invoice {brand_invoice.invoice_number} from brand"
    )
    db.add(entry)
    db.commit()
    return entry


def match_payment_to_invoices(db: Session, shop_id: int, payment_amount: float):
    """
    Match an incoming payment against a shop's unpaid invoices.
    Simple strategy: match oldest invoices first (FIFO), allow partial payments.
    Returns list of (invoice_id, amount_applied) matches.
    """
    unpaid_entries = (
        db.query(LedgerEntry)
        .filter(
            LedgerEntry.party_type == "shop",
            LedgerEntry.party_id == shop_id,
            LedgerEntry.entry_type == "invoice"
        )
        .order_by(LedgerEntry.date.asc())
        .all()
    )

    settled_entries = (
        db.query(LedgerEntry)
        .filter(
            LedgerEntry.party_type == "shop",
            LedgerEntry.party_id == shop_id,
            LedgerEntry.entry_type == "payment"
        )
        .all()
    )
    already_settled = sum(e.amount for e in settled_entries) * -1  # payments stored as negative

    total_owed = sum(e.amount for e in unpaid_entries)
    remaining_owed = total_owed - already_settled

    remaining_payment = payment_amount
    matches = []

    for entry in unpaid_entries:
        if remaining_payment <= 0:
            break
        invoice_amount = entry.amount
        apply_amount = min(invoice_amount, remaining_payment)
        matches.append((entry.reference_id, apply_amount))
        remaining_payment -= apply_amount

    return matches, remaining_payment  # remaining_payment > 0 means overpayment


def record_payment(db: Session, shop_id: int, amount: float, notes: str = None):
    """Record a payment from a shop, match it to invoices, log ledger entry"""
    payment = Payment(shop_id=shop_id, amount=amount, notes=notes)
    db.add(payment)
    db.commit()
    db.refresh(payment)

    matches, overpayment = match_payment_to_invoices(db, shop_id, amount)

    entry = LedgerEntry(
        party_type="shop",
        party_id=shop_id,
        entry_type="payment",
        reference_id=payment.id,
        amount=-amount,  # negative because it reduces what shop owes
        description=f"Payment received, matched to {len(matches)} invoice(s)"
    )
    db.add(entry)
    db.commit()

    return {
        "payment_id": payment.id,
        "matched_invoices": matches,
        "overpayment": overpayment
    }


def calculate_commission_and_remit(db: Session, brand_id: int, sale_amount: float):
    """
    Given a sale amount attributable to a brand, calculate commission split.
    Returns commission_kept and amount_owed_to_brand.
    """
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise ValueError("Brand not found")

    commission_rate = brand.commission_rate or 0.0
    commission_amount = round(sale_amount * commission_rate / 100, 2)
    amount_owed_to_brand = round(sale_amount - commission_amount, 2)

    return {
        "sale_amount": sale_amount,
        "commission_rate": commission_rate,
        "commission_amount": commission_amount,
        "amount_owed_to_brand": amount_owed_to_brand
    }


def record_remittance(db: Session, brand_id: int, sale_amount: float, notes: str = None):
    """Record money paid to a brand after commission deduction, log ledger entry"""
    split = calculate_commission_and_remit(db, brand_id, sale_amount)

    remittance = Remittance(
        brand_id=brand_id,
        amount=split["amount_owed_to_brand"],
        commission_deducted=split["commission_amount"],
        notes=notes
    )
    db.add(remittance)
    db.commit()
    db.refresh(remittance)

    entry = LedgerEntry(
        party_type="brand",
        party_id=brand_id,
        entry_type="remittance",
        reference_id=remittance.id,
        amount=-sale_amount,
        description=f"Remittance sent, commission kept: {split['commission_amount']}"
    )
    db.add(entry)
    db.commit()

    return {
        "remittance_id": remittance.id,
        **split
    }


def get_brand_balance(db: Session, brand_id: int) -> float:
    """Sum all ledger entries for a brand — positive means we owe them"""
    entries = db.query(LedgerEntry).filter(
        LedgerEntry.party_type == "brand",
        LedgerEntry.party_id == brand_id
    ).all()
    return round(sum(e.amount for e in entries), 2)


def get_shop_balance(db: Session, shop_id: int) -> float:
    """Sum all ledger entries for a shop — positive means they owe us"""
    entries = db.query(LedgerEntry).filter(
        LedgerEntry.party_type == "shop",
        LedgerEntry.party_id == shop_id
    ).all()
    return round(sum(e.amount for e in entries), 2)