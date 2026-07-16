import { useEffect, useState } from "react";
import { getBrands, getShops, getBrandBalance, getShopBalance } from "./api";

export default function LedgerDashboard() {
  const [brands, setBrands] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const totalOwedToBrands = brands.reduce((sum, b) => sum + Math.max(b.balance, 0), 0);
  const totalDueFromShops = shops.reduce((sum, s) => sum + Math.max(s.balance, 0), 0);

  const Ledger = ({ title, rows, label }) => (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 22, marginBottom: 16 }}>{title}</h2>
      <div style={{
        border: "1px solid var(--rule)",
        borderRadius: 8,
        background: "white",
        overflow: "hidden"
      }}>
        {rows.length === 0 && (
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: 0 }}>
              Nothing recorded here yet.
            </p>
          </div>
        )}
        {rows.map((r, i) => (
          <div key={r.id} style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: i < rows.length - 1 ? "1px solid var(--rule)" : "none"
          }}>
            <span style={{ fontSize: 15 }}>{r.name}</span>
            <span className="mono" style={{
              fontSize: 15,
              color: r.balance > 0 ? "var(--gold)" : "var(--ink-soft)"
            }}>
              ₹{r.balance.toLocaleString("en-IN")} {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Loading ledger…</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
        <div style={{
          flex: 1, border: "1px solid var(--rule)", borderRadius: 8,
          padding: "20px 24px", background: "white"
        }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 6px 0" }}>Owed to brands</p>
          <p className="mono" style={{ fontSize: 26, margin: 0, color: "var(--gold)" }}>
            ₹{totalOwedToBrands.toLocaleString("en-IN")}
          </p>
        </div>
        <div style={{
          flex: 1, border: "1px solid var(--rule)", borderRadius: 8,
          padding: "20px 24px", background: "white"
        }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 6px 0" }}>Due from shops</p>
          <p className="mono" style={{ fontSize: 26, margin: 0, color: "var(--sage)" }}>
            ₹{totalDueFromShops.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <Ledger title="Brand balances" rows={brands} label="owed" />
      <Ledger title="Shop balances" rows={shops} label="due" />
    </div>
  );
}