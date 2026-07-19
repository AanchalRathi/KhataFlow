import { useEffect, useState } from "react";
import { getBrands, getShops, deleteBrand, deleteShop } from "./api";

const API_BASE = "http://localhost:8000";

async function createBrand(data) {
  const res = await fetch(`${API_BASE}/brands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function createShop(data) {
  const res = await fetch(`${API_BASE}/shops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

export default function BrandsShops() {
  const [brands, setBrands] = useState([]);
  const [shops, setShops] = useState([]);
  const [tab, setTab] = useState("brands");

  const [brandForm, setBrandForm] = useState({ name: "", gstin: "", commission_rate: "" });
  const [shopForm, setShopForm] = useState({ name: "", gstin: "", location: "" });

  const refresh = async () => {
    setBrands(await getBrands());
    setShops(await getShops());
  };

  useEffect(() => { refresh(); }, []);

  const handleAddBrand = async () => {
    if (!brandForm.name) return;
    await createBrand({
      name: brandForm.name,
      gstin: brandForm.gstin || null,
      commission_rate: parseFloat(brandForm.commission_rate) || 0
    });
    setBrandForm({ name: "", gstin: "", commission_rate: "" });
    refresh();
  };

  const handleAddShop = async () => {
    if (!shopForm.name) return;
    await createShop({
      name: shopForm.name,
      gstin: shopForm.gstin || null,
      location: shopForm.location || null
    });
    setShopForm({ name: "", gstin: "", location: "" });
    refresh();
  };

  const handleDeleteBrand = async (id, name) => {
    if (!window.confirm(`Remove ${name}? This also deletes their invoice and payment history.`)) return;
    await deleteBrand(id);
    refresh();
  };

  const handleDeleteShop = async (id, name) => {
    if (!window.confirm(`Remove ${name}? This also deletes their invoice and payment history.`)) return;
    await deleteShop(id);
    refresh();
  };

  const inputStyle = {
    padding: "10px 12px",
    border: "1px solid var(--rule)",
    borderRadius: 4,
    fontFamily: "Inter",
    fontSize: 14,
    flex: 1,
    background: "var(--paper)"
  };

  const buttonStyle = {
    padding: "10px 20px",
    background: "var(--sage)",
    color: "white",
    border: "none",
    borderRadius: 4,
    fontFamily: "Inter",
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap"
  };

  const cardStyle = {
    border: "1px solid var(--rule)",
    borderRadius: 8,
    background: "white",
    overflow: "hidden"
  };

  const emptyStateStyle = {
    padding: "32px 24px",
    textAlign: "center"
  };

  return (
    <div>
      <h2 style={{ fontSize: 32, marginBottom: 8 }}>Brands & Shops</h2>
      <p style={{ color: "var(--ink-soft)", marginBottom: 32, fontSize: 15 }}>
        Manage the brands you distribute for and the shops you sell to.
      </p>

      <div style={{ display: "flex", gap: 24, marginBottom: 24, borderBottom: "1px solid var(--rule)" }}>
        {["brands", "shops"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              border: "none",
              fontFamily: "Inter",
              fontSize: 15,
              fontWeight: 500,
              padding: "0 0 12px 0",
              color: tab === t ? "var(--sage)" : "var(--ink-soft)",
              borderBottom: tab === t ? "2px solid var(--sage)" : "2px solid transparent",
              cursor: "pointer"
            }}
          >
            {t === "brands" ? "Brands" : "Shops"}
          </button>
        ))}
      </div>

      {tab === "brands" ? (
        <>
          <div style={{
            border: "1px solid var(--rule)",
            borderRadius: 8,
            padding: 20,
            background: "white",
            marginBottom: 32,
            display: "flex",
            gap: 12
          }}>
            <input style={inputStyle} placeholder="Brand name"
              value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} />
            <input style={inputStyle} placeholder="GSTIN (optional)"
              value={brandForm.gstin} onChange={(e) => setBrandForm({ ...brandForm, gstin: e.target.value })} />
            <input style={{ ...inputStyle, flex: 0.5 }} placeholder="Commission %"
              value={brandForm.commission_rate} onChange={(e) => setBrandForm({ ...brandForm, commission_rate: e.target.value })} />
            <button style={buttonStyle} onClick={handleAddBrand}>Add brand</button>
          </div>

          <div style={cardStyle}>
            {brands.length === 0 && (
              <div style={emptyStateStyle}>
                <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: 0 }}>No brands added yet.</p>
              </div>
            )}
            {brands.map((b, i) => (
              <div key={b.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px",
                borderBottom: i < brands.length - 1 ? "1px solid var(--rule)" : "none"
              }}>
                <span style={{ fontSize: 15 }}>{b.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span className="mono" style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                    {b.commission_rate}% commission
                  </span>
                  <button
                    onClick={() => handleDeleteBrand(b.id, b.name)}
                    style={{
                      background: "none", border: "none", color: "var(--flag)", fontSize: 13,
                      cursor: "pointer", padding: "4px 8px"
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{
            border: "1px solid var(--rule)",
            borderRadius: 8,
            padding: 20,
            background: "white",
            marginBottom: 32,
            display: "flex",
            gap: 12
          }}>
            <input style={inputStyle} placeholder="Shop name"
              value={shopForm.name} onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })} />
            <input style={inputStyle} placeholder="GSTIN (optional)"
              value={shopForm.gstin} onChange={(e) => setShopForm({ ...shopForm, gstin: e.target.value })} />
            <input style={inputStyle} placeholder="Location"
              value={shopForm.location} onChange={(e) => setShopForm({ ...shopForm, location: e.target.value })} />
            <button style={buttonStyle} onClick={handleAddShop}>Add shop</button>
          </div>

          <div style={cardStyle}>
            {shops.length === 0 && (
              <div style={emptyStateStyle}>
                <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: 0 }}>No shops added yet.</p>
              </div>
            )}
            {shops.map((s, i) => (
              <div key={s.id} style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: i < shops.length - 1 ? "1px solid var(--rule)" : "none"
              }}>
                <span style={{ fontSize: 15 }}>{s.name}</span>
                <span className="mono" style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                  {s.location || "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}