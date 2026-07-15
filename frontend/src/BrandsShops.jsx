import { useEffect, useState } from "react";
import { getBrands, getShops } from "./api";

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

  return (
    <div>
      <h2 style={{ fontSize: 28, marginBottom: 8 }}>Brands & Shops</h2>
      <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>
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
          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            <input style={inputStyle} placeholder="Brand name"
              value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} />
            <input style={inputStyle} placeholder="GSTIN (optional)"
              value={brandForm.gstin} onChange={(e) => setBrandForm({ ...brandForm, gstin: e.target.value })} />
            <input style={{ ...inputStyle, flex: 0.5 }} placeholder="Commission %"
              value={brandForm.commission_rate} onChange={(e) => setBrandForm({ ...brandForm, commission_rate: e.target.value })} />
            <button style={buttonStyle} onClick={handleAddBrand}>Add brand</button>
          </div>

          <div style={{ borderTop: "1px solid var(--rule)" }}>
            {brands.length === 0 && <p style={{ color: "var(--ink-soft)", padding: "16px 0", fontSize: 14 }}>No brands added yet.</p>}
            {brands.map((b) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--rule)" }}>
                <span style={{ fontSize: 15 }}>{b.name}</span>
                <span className="mono" style={{ fontSize: 14, color: "var(--ink-soft)" }}>{b.commission_rate}% commission</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            <input style={inputStyle} placeholder="Shop name"
              value={shopForm.name} onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })} />
            <input style={inputStyle} placeholder="GSTIN (optional)"
              value={shopForm.gstin} onChange={(e) => setShopForm({ ...shopForm, gstin: e.target.value })} />
            <input style={inputStyle} placeholder="Location"
              value={shopForm.location} onChange={(e) => setShopForm({ ...shopForm, location: e.target.value })} />
            <button style={buttonStyle} onClick={handleAddShop}>Add shop</button>
          </div>

          <div style={{ borderTop: "1px solid var(--rule)" }}>
            {shops.length === 0 && <p style={{ color: "var(--ink-soft)", padding: "16px 0", fontSize: 14 }}>No shops added yet.</p>}
            {shops.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--rule)" }}>
                <span style={{ fontSize: 15 }}>{s.name}</span>
                <span className="mono" style={{ fontSize: 14, color: "var(--ink-soft)" }}>{s.location || "—"}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
