import { useEffect, useState } from "react";
import { getBrands, getShops, getBrandBalance, getShopBalance, getBrandTransactions, getShopTransactions,deletePayment, deleteRemittance  } from "./api";

function TransactionRow({ t, onDelete  }) {
  const canDelete = t.type === "payment" || t.type === "remittance";

  const handleDelete = async () => {
    if (!window.confirm("Delete this transaction? This will affect the balance.")) return;
    if (t.type === "payment") await deletePayment(t.reference_id);
    else if (t.type === "remittance") await deleteRemittance(t.reference_id);
    onDelete();
  };
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0",
      borderBottom: "1px solid var(--rule)", fontSize: 13
    }}>
      <span style={{ textTransform: "capitalize", color: "var(--ink-soft)" }}>
        {t.type} — {t.description}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono" style={{ color: t.amount > 0 ? "var(--gold)" : "var(--sage)" }}>
          {t.amount > 0 ? "+" : ""}₹{t.amount.toLocaleString("en-IN")}
        </span>
        {canDelete && (
          <button onClick={handleDelete} style={{
            background: "none", border: "none", color: "var(--flag)", fontSize: 12, cursor: "pointer"
          }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function TransactionModal({ name, transactions, onClose }) {
  return (
    <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(27, 43, 41, 0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 8, width: 480, maxHeight: "70vh",
          display: "flex", flexDirection: "column", overflow: "hidden"
        }}
      >
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid var(--rule)",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <h3 style={{ fontSize: 18, margin: 0 }}>{name} — full history</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ink-soft)"
          }}>×</button>
        </div>
        <div style={{ padding: "12px 24px", overflowY: "auto" }}>
          {transactions.length === 0 && (
            <p style={{ color: "var(--ink-soft)", fontSize: 14, padding: "16px 0" }}>No transactions yet.</p>
          )}
          {transactions.map((t) => <TransactionRow key={t.id} t={t} onDelete={onDelete} />)}
      </div>
    </div>
  </div>
  );
}

export default function LedgerDashboard() {
  const [brands, setBrands] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { name, transactions } or null

  useEffect(() => {
    (async () => {
      const brandList = await getBrands();
      const shopList = await getShops();

      const brandsWithData = await Promise.all(
        brandList.map(async (b) => ({
          ...b,
          balance: (await getBrandBalance(b.id)).balance_owed,
          recent: (await getBrandTransactions(b.id)).slice(0, 3),
          all: null
        }))
      );
      const shopsWithData = await Promise.all(
        shopList.map(async (s) => ({
          ...s,
          balance: (await getShopBalance(s.id)).balance_owed,
          recent: (await getShopTransactions(s.id)).slice(0, 3),
          all: null
        }))
      );

      setBrands(brandsWithData);
      setShops(shopsWithData);
      setLoading(false);
    })();
  }, []);

  const openModal = async (type, item) => {
    const all = type === "brand" ? await getBrandTransactions(item.id) : await getShopTransactions(item.id);
    setModal({ name: item.name, transactions: all, type, id: item.id });
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
        {rows.map((r, i) => (
          <div key={r.id} style={{
            padding: "16px 20px",
            borderBottom: i < rows.length - 1 ? "1px solid var(--rule)" : "none"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: r.recent.length ? 10 : 0 }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{r.name}</span>
              <span className="mono" style={{ fontSize: 15, color: r.balance > 0 ? "var(--gold)" : "var(--ink-soft)" }}>
                ₹{r.balance.toLocaleString("en-IN")} {label}
              </span>
            </div>

            {r.recent.length > 0 && (
              <div style={{ paddingLeft: 4 }}>
                {r.recent.map((t) => <TransactionRow key={t.id} t={t} />)}
                <button
                  onClick={() => openModal(type, r)}
                  style={{
                    background: "none", border: "none", color: "var(--sage)",
                    fontSize: 13, fontWeight: 500, padding: "8px 0 0 0", cursor: "pointer"
                  }}
                >
                  View all →
                </button>
              </div>
            )}
          </div>
        ))}
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

      {modal && (
        <TransactionModal
          name={modal.name}
          transactions={modal.transactions}
          onClose={() => setModal(null)}
          onDelete={async () => {
            const updated = modal.type === "brand"
              ? await getBrandTransactions(modal.id)
              : await getShopTransactions(modal.id);
            setModal({ ...modal, transactions: updated });
            window.location.reload(); 
          }}
        />
      )}
    </div>
  );
}