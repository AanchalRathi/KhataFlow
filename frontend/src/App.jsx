import { useState } from "react";
import UploadReview from "./UploadReview";
import LedgerDashboard from "./LedgerDashboard";
import BrandsShops from "./BrandsShops";
import PaymentsRemittances from "./PaymentsRemittances";

const PAGES = {
  upload: { label: "Upload & Review", component: UploadReview },
  ledger: { label: "Ledger", component: LedgerDashboard },
  parties: { label: "Brands & Shops", component: BrandsShops },
  payments: { label: "Payments", component: PaymentsRemittances }
};

export default function App() {
  const [page, setPage] = useState("upload");
  const Page = PAGES[page].component;

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{
        borderBottom: "1px solid var(--rule)",
        padding: "24px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{ fontSize: 24 }}>KhataFlow</h1>
        <nav style={{ display: "flex", gap: 24 }}>
          {Object.entries(PAGES).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              style={{
                background: "none",
                border: "none",
                fontFamily: "Inter",
                fontSize: 15,
                fontWeight: 500,
                color: page === key ? "var(--sage)" : "var(--ink-soft)",
                borderBottom: page === key ? "2px solid var(--sage)" : "2px solid transparent",
                paddingBottom: 4,
                cursor: "pointer"
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main style={{ padding: "40px", maxWidth: 900, margin: "0 auto" }}>
        <Page />
      </main>
    </div>
  );
}