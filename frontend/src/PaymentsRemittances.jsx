import { useState, useEffect } from "react";
import { getBrands, getShops } from "./api";

const API_BASE = "http://localhost:8000";

async function postPayment(data) {
  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function postRemittance(data) {
  const res = await fetch(`${API_BASE}/remittances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

export default function PaymentsRemittances() {
  const [brands, setBrands] = useState([]);
  const [shops, setShops] = useState([]);

  const [paymentError, setPaymentError] = useState("");
  const [remittanceError, setRemittanceError] = useState("");
  const [paymentForm, setPaymentForm] = useState({ shop_id: "", amount: "", notes: "" });
  const [remittanceForm, setRemittanceForm] = useState({ brand_id: "", sale_amount: "", notes: "" });
  const [paymentResult, setPaymentResult] = useState(null);
  const [remittanceResult, setRemittanceResult] = useState(null);

  useEffect(() => {
    (async () => {
      setBrands(await getBrands());
      setShops(await getShops());
    })();
  }, []);

  const inputStyle = {
    padding: "10px 12px",
    border: "1px solid var(--rule)",
    borderRadius: 4,
    fontFamily: "Inter",
    fontSize: 14,
    flex: 1
  };

  const buttonStyle = {
    padding: "10px 20px",
    background: "var(--sage)",
    color: "white",
    border: "none",
    borderRadius: 4,
    fontFamily: "Inter",
    fontWeight: 500,
    cursor: "pointer"
  };

  const handlePayment = async () => {
    setPaymentError("");
    if (!paymentForm.shop_id) {
      setPaymentError("Select a shop first.");
      return;
    }
    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || isNaN(amount) || amount <= 0) {
      setPaymentError("Enter a valid amount greater than 0.");
      return;
    }
    const result = await postPayment({
      shop_id: parseInt(paymentForm.shop_id),
      amount,
      notes: paymentForm.notes || null
    });
    
    setPaymentResult(result);
    setPaymentForm({ shop_id: "", amount: "", notes: "" });
  };

  const handleRemittance = async () => {
    setRemittanceError("");
    if (!remittanceForm.brand_id) {
      setRemittanceError("Select a brand first.");
      return;
    }
    const saleAmount = parseFloat(remittanceForm.sale_amount);
    if (!remittanceForm.sale_amount || isNaN(saleAmount) || saleAmount <= 0) {
      setRemittanceError("Enter a valid amount greater than 0.");
      return;
    }
    const result = await postRemittance({
      brand_id: parseInt(remittanceForm.brand_id),
      sale_amount: saleAmount,
      notes: remittanceForm.notes || null
    });
    
    setRemittanceResult(result);
    setRemittanceForm({ brand_id: "", sale_amount: "", notes: "" });
  };

  return (
    <div>
      <h2 style={{ fontSize: 28, marginBottom: 32 }}>Payments & Remittances</h2>

      <div style={{
        border: "1px solid var(--rule)", borderRadius: 8, padding: 24,
        background: "white", marginBottom: 32
      }}>
        <h3 style={{ fontSize: 20, marginBottom: 16 }}>Record a payment from a shop</h3>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <select style={inputStyle} value={paymentForm.shop_id}
            onChange={(e) => setPaymentForm({ ...paymentForm, shop_id: e.target.value })}>
            <option value="">Select shop</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="number" min="0" step="0.01" style={inputStyle} placeholder="Amount received"
            value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          <input style={inputStyle} placeholder="Notes (optional)"
            value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
          <button style={buttonStyle} onClick={handlePayment}>Record payment</button>
        </div>
        {paymentError && (
          <p style={{ color: "var(--flag)", fontSize: 13, marginBottom: 12 }}>{paymentError}</p>
        )}
        {paymentResult && (
          <div style={{ padding: "12px 16px", background: "var(--sage-soft)", borderRadius: 4, fontSize: 14 }}>
            Matched against {paymentResult.matched_invoices?.length || 0} invoice(s).
            {paymentResult.overpayment > 0 && ` Overpayment of ₹${paymentResult.overpayment}.`}
          </div>
        )}
      </div>

      <div style={{
        border: "1px solid var(--rule)", borderRadius: 8, padding: 24,
        background: "white", marginBottom: 32
      }}>
        <h3 style={{ fontSize: 20, marginBottom: 16 }}>Send a remittance to a brand</h3>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <select style={inputStyle} value={remittanceForm.brand_id}
            onChange={(e) => setRemittanceForm({ ...remittanceForm, brand_id: e.target.value })}>
            <option value="">Select brand</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input type="number" min="0" step="0.01" style={inputStyle} placeholder="Sale amount"
            value={remittanceForm.sale_amount} onChange={(e) => setRemittanceForm({ ...remittanceForm, sale_amount: e.target.value })} />
          <input style={inputStyle} placeholder="Notes (optional)"
            value={remittanceForm.notes} onChange={(e) => setRemittanceForm({ ...remittanceForm, notes: e.target.value })} />
          <button style={buttonStyle} onClick={handleRemittance}>Send remittance</button>
        </div>
        {remittanceError && (
          <p style={{ color: "var(--flag)", fontSize: 13, marginBottom: 12 }}>{remittanceError}</p>
        )}
        {remittanceResult && (
          <div style={{ padding: "12px 16px", background: "var(--sage-soft)", borderRadius: 4, fontSize: 14 }}>
            Commission kept: <span className="mono">₹{remittanceResult.commission_amount}</span> ·
            Sent to brand: <span className="mono">₹{remittanceResult.amount_owed_to_brand}</span>
          </div>
        )}
      </div>
    </div>
  );
}