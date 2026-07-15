import { useEffect, useState } from "react";
import { getBrands, getShops, getBrandBalance, getShopBalance } from "./api";

export default function LedgerDashboard() {
  const [brands, setBrands] = useState([]);
  const [shops, setShops] = useState([]);

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
    })();
  }, []);

  const Ledger = ({ title, rows, label }) => (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 22, marginBottom: 16 }}>{title}</h2>
      <div style={{ borderTop: "1px solid var(--rule)" }}>
        {rows.length === 0 && (
          <p style={{ color: "var(--ink-soft)", padding: "16px 0", fontSize: 14 }}>Nothing here yet.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 0",
            borderBottom: "1px solid var(--rule)"
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

  return (
    <div>
      <Ledger title="Owed to brands" rows={brands} label="owed" />
      <Ledger title="Owed by shops" rows={shops} label="due" />
    </div>
  );
}