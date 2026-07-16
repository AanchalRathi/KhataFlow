import { useState } from "react";
import { uploadInvoice } from "./api";

export default function UploadReview() {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("printed");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const LABELS = {
    cgst_rate: "CGST Rate", cgst_amount: "CGST Amount",
    sgst_rate: "SGST Rate", sgst_amount: "SGST Amount",
    igst_rate: "IGST Rate", igst_amount: "IGST Amount",
    vendor_gstin: "Vendor GSTIN"
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    const res = await uploadInvoice(file, docType);
    setResult(res);
    setLoading(false);
  };

  const fields = result?.extracted_data
    ? Object.entries(result.extracted_data).filter(([k]) => k !== "line_items")
    : [];

  return (
    <div>
      <h2 style={{ fontSize: 28, marginBottom: 8 }}>Upload an invoice</h2>
      <p style={{ color: "var(--ink-soft)", marginBottom: 32 }}>
        Add a printed invoice or a handwritten bilty/challan for review.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "1px solid var(--rule)",
            borderRadius: 4,
            fontFamily: "Inter",
            fontSize: 14,
            background: "white"
          }}
        >
          <option value="printed">Printed invoice</option>
          <option value="handwritten">Handwritten bilty/challan</option>
        </select>

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ fontFamily: "Inter", fontSize: 14 }}
        />

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          style={{
            padding: "10px 20px",
            background: "var(--sage)",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontFamily: "Inter",
            fontWeight: 500,
            cursor: file ? "pointer" : "not-allowed",
            opacity: file ? 1 : 0.5
          }}
        >
          {loading ? "Reading document…" : "Extract details"}
        </button>
      </div>

      {result && (
        <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 24 }}>
          <div style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 20,
            background: result.validation_status === "valid" ? "var(--sage-soft)" : "var(--flag-soft)",
            color: result.validation_status === "valid" ? "var(--sage)" : "var(--flag)"
          }}>
            {result.validation_status === "valid" ? "✓ Valid" : "⚑ Flagged"}
            {result.validation_reason ? ` — ${result.validation_reason}` : ""}
          </div>

          {fields.map(([key, value]) => (
            <div key={key} style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid var(--rule)"
            }}>
              <span style={{ color: "var(--ink-soft)", fontSize: 14, textTransform: "capitalize" }}>
                {LABELS[key] || key.replace(/_/g, " ")}
              </span>
              <span className="mono" style={{ fontSize: 14 }}>
                {value === null ? "—" : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}