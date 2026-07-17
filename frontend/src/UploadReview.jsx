import { useState } from "react";
import { uploadInvoice, updateInvoice, getBrands, getShops } from "./api";

const LABELS = {
  cgst_rate: "CGST Rate", cgst_amount: "CGST Amount",
  sgst_rate: "SGST Rate", sgst_amount: "SGST Amount",
  igst_rate: "IGST Rate", igst_amount: "IGST Amount",
  vendor_gstin: "Vendor GSTIN"
};

export default function UploadReview() {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("printed");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState([]);
  const [shops, setShops] = useState([]);
  const [partyType, setPartyType] = useState("brand");
  const [partyId, setPartyId] = useState("");

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    const res = await uploadInvoice(file, docType, partyType, partyId || null);
    setResult(res);
    setEditedData(res.extracted_data || null);
    setLoading(false);
  };

  const handleFieldChange = (key, value) => {
    setEditedData({ ...editedData, [key]: value });
  };

  const handleSaveCorrections = async () => {
    setSaving(true);
    const numericFields = ["taxable_value", "cgst_rate", "cgst_amount", "sgst_rate", "sgst_amount", "igst_rate", "igst_amount", "total_amount"];
    const cleaned = { ...editedData };
    numericFields.forEach((f) => {
      if (cleaned[f] !== null && cleaned[f] !== "") cleaned[f] = parseFloat(cleaned[f]);
    });
    const res = await updateInvoice(result.invoice_id, cleaned);
    setResult(res);
    setEditedData(res.extracted_data);
    setSaving(false);
  };

  const fields = editedData
    ? Object.entries(editedData).filter(([k]) => k !== "line_items")
    : [];

  const isFlagged = result?.validation_status === "flagged";

  useEffect(() => {
    (async () => {
      setBrands(await getBrands());
      setShops(await getShops());
    })();
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 32, marginBottom: 8 }}>Upload an invoice</h2>
      <p style={{ color: "var(--ink-soft)", marginBottom: 32, fontSize: 15 }}>
        Add a printed invoice or a handwritten bilty/challan for review.
      </p>

      <div style={{
        border: "1px solid var(--rule)", borderRadius: 8, padding: 24,
        background: "white", marginBottom: 32
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            style={{
              padding: "10px 14px", border: "1px solid var(--rule)", borderRadius: 4,
              fontFamily: "Inter", fontSize: 14, background: "var(--paper)"
            }}
          >
          <select
            value={partyType}
            onChange={(e) => { setPartyType(e.target.value); setPartyId(""); }}
            style={{ padding: "10px 14px", border: "1px solid var(--rule)", borderRadius: 4, fontFamily: "Inter", fontSize: 14, background: "var(--paper)" }}
          >
            <option value="brand">From a brand</option>
            <option value="shop">To a shop</option>
          </select>

          <select
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            style={{ padding: "10px 14px", border: "1px solid var(--rule)", borderRadius: 4, fontFamily: "Inter", fontSize: 14, background: "var(--paper)" }}
          >
            <option value="">Select {partyType}…</option>
            {(partyType === "brand" ? brands : shops).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
            <option value="printed">Printed invoice</option>
            <option value="handwritten">Handwritten bilty/challan</option>
          </select>

          <label style={{
            padding: "10px 14px", border: "1px dashed var(--rule)", borderRadius: 4,
            fontFamily: "Inter", fontSize: 14, color: "var(--ink-soft)", cursor: "pointer", flex: 1
          }}>
            {file ? file.name : "Choose a file to upload"}
            <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: "none" }} />
          </label>

          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            style={{
              padding: "10px 24px", background: "var(--sage)", color: "white", border: "none",
              borderRadius: 4, fontFamily: "Inter", fontWeight: 500, fontSize: 14,
              cursor: file ? "pointer" : "not-allowed", opacity: file ? 1 : 0.5, whiteSpace: "nowrap"
            }}
          >
            {loading ? "Reading document…" : "Extract details"}
          </button>
        </div>
      </div>

      {!result && (
        <div style={{
          border: "1px dashed var(--rule)", borderRadius: 8, padding: "48px 24px",
          textAlign: "center", color: "var(--ink-soft)"
        }}>
          <p style={{ fontSize: 14, margin: 0 }}>
            Extracted fields and validation results will appear here once you upload a document.
          </p>
        </div>
      )}

      {result && !result.error && (
        <div style={{ border: "1px solid var(--rule)", borderRadius: 8, background: "white", padding: 24 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20
          }}>
            <div style={{
              display: "inline-block", padding: "4px 12px", borderRadius: 4, fontSize: 13, fontWeight: 500,
              background: result.validation_status === "valid" ? "var(--sage-soft)" : "var(--flag-soft)",
              color: result.validation_status === "valid" ? "var(--sage)" : "var(--flag)"
            }}>
              {result.validation_status === "valid" ? "✓ Valid" : "⚑ Flagged"}
              {result.validation_reason ? ` — ${result.validation_reason}` : ""}
            </div>
            {result.linked_to_ledger && (
              <p style={{ fontSize: 13, color: "var(--sage)", marginTop: 8 }}>
                ✓ Added to ledger
              </p>
            )}
            {isFlagged && (
              <button
                onClick={handleSaveCorrections}
                disabled={saving}
                style={{
                  padding: "8px 16px", background: "var(--sage)", color: "white", border: "none",
                  borderRadius: 4, fontFamily: "Inter", fontWeight: 500, fontSize: 13, cursor: "pointer"
                }}
              >
                {saving ? "Saving…" : "Save corrections"}
              </button>
            )}
          </div>

          {fields.map(([key, value]) => (
            <div key={key} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "1px solid var(--rule)"
            }}>
              <span style={{ color: "var(--ink-soft)", fontSize: 14, textTransform: "capitalize" }}>
                {LABELS[key] || key.replace(/_/g, " ")}
              </span>
              {isFlagged ? (
                <input
                  className="mono"
                  value={value === null ? "" : value}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  style={{
                    fontSize: 14, textAlign: "right", border: "1px solid var(--rule)",
                    borderRadius: 4, padding: "4px 8px", width: 200, fontFamily: "IBM Plex Mono"
                  }}
                />
              ) : (
                <span className="mono" style={{ fontSize: 14 }}>
                  {value === null ? "—" : String(value)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}