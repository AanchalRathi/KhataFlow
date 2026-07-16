import { useEffect, useState } from "react";
import { getBrands, getShops, getBrandBalance, getShopBalance, getBrandTransactions, getShopTransactions } from "./api";

export default function LedgerDashboard() {
  const [brands, setBrands] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // "brand-1" or "shop-3"
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    (async () => {
      const brandList = await getBrands();
      const shopList = await getShops();

      const brandsWithBalance = await Promise.all(
        brandList.map(async (b) => ({ ...b, balance: (await getBrandBalance(b.id)).balance_owed }))
      );
      const shopsWithBalance = await Promise.all(
        shopList.map(async (s) => ({ ...s, balance: (await getShopBalance(s.id)).balance_owed }))
      );

      setBrands(brandsWithBalance);
      setShops(shopsWithBalance);
      setLoading(false);
    })();
  }, []);

  const toggleExpand = async (type, id) => {
    const key = `${type}-${id}`;
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    const data = type === "brand" ? await getBrandTransactions(id) : await getShopTransactions(id);
    setTransactions(data);
    setExpanded(key);
  };

  const totalOwedToBrands = brands.reduce((sum, b) => sum + Math.max(b.balance, 0), 0);
  const totalDueFromShops = shops.reduce((sum, s) => sum + Math.max(s.balance, 0), 0);

  const Ledger = ({ title, rows, label, type }) => (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 22, marginBottom: 16 }}>{title}</h2>
      <div style={{ border: "1px solid var(--rule)", borderRadius: 8, background: "white", overflow: "hidden" }}>
        {rows.length === 0 && (
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: 0 }}>Nothing recorded here yet.</p>
          </div>
        )}
        {rows.map((r, i) => {
          const key = `${type}-${r.id}`;
          const isOpen = expanded === key;
          return (
            <div key={r.id}>
              <div
                onClick={() => toggleExpand(type, r.id)}
                style={{
                  display: "flex", justifyContent: "space-between", padding: "14px 20px",
                  borderBottom: (i < rows.length - 1 || isOpen) ? "1px solid var(--rule)" : "none",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: 15 }}>{r.name}</span>
                <span className="mono" style={{ fontSize: 15, color: r.balance > 0 ? "var(--gold)" : "var(--ink-soft)" }}>
                  ₹{r.balance.toLocaleString("en-IN")} {label}
                </span>
              </div>
              {isOpen && (
                <div style={{ background: "var(--sage-soft)", padding: "12px 20px" }}>
                  {transactions.length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "8px 0" }}>No transactions yet.</p>
                  )}
                  {transactions.map((t) => (
                    <div key={t.id} style={{
                      display: "flex", justifyContent: "space-between", padding: "8px 0",
                      borderBottom: "1px solid var(--rule)", fontSize: 13
                    }}>
                      <span style={{ textTransform: "capitalize" }}>{t.type} — {t.description}</span>
                      <span className="mono">{t.amount > 0 ? "+" : ""}₹{t.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (loading) return <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Loading ledger…</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
        <div style={{ flex: 1, border: "1px solid var(--rule)", borderRadius: 8, padding: "20px 24px", background: "white" }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 6px 0" }}>Owed to brands</p>
          <p className="mono" style={{ fontSize: 26, margin: 0, color: "var(--gold)" }}>₹{totalOwedToBrands.toLocaleString("en-IN")}</p>
        </div>
        <div style={{ flex: 1, border: "1px solid var(--rule)", borderRadius: 8, padding: "20px 24px", background: "white" }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 6px 0" }}>Due from shops</p>
          <p className="mono" style={{ fontSize: 26, margin: 0, color: "var(--sage)" }}>₹{totalDueFromShops.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <Ledger title="Brand balances" rows={brands} label="owed" type="brand" />
      <Ledger title="Shop balances" rows={shops} label="due" type="shop" />
    </div>
  );
}