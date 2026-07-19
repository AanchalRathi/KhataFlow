const API_BASE = "http://localhost:8000"; // update to your Render URL when deployed

export async function uploadInvoice(file, docType, partyType, partyId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", docType);
  if (partyType) formData.append("party_type", partyType);
  if (partyId) formData.append("party_id", partyId);
  const res = await fetch(`${API_BASE}/upload-invoice`, { method: "POST", body: formData });
  return res.json();
}

export async function getBrands() {
  const res = await fetch(`${API_BASE}/brands`);
  return res.json();
}

export async function getShops() {
  const res = await fetch(`${API_BASE}/shops`);
  return res.json();
}

export async function getBrandBalance(id) {
  const res = await fetch(`${API_BASE}/brands/${id}/balance`);
  return res.json();
}

export async function getShopBalance(id) {
  const res = await fetch(`${API_BASE}/shops/${id}/balance`);
  return res.json();
}

export async function getBrandTransactions(id) {
  const res = await fetch(`${API_BASE}/brands/${id}/transactions`);
  return res.json();
}

export async function getShopTransactions(id) {
  const res = await fetch(`${API_BASE}/shops/${id}/transactions`);
  return res.json();
}

export async function updateInvoice(invoiceId, extractedData) {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extracted_data: extractedData })
  });
  return res.json();
}

export async function deleteBrand(id) {
  const res = await fetch(`${API_BASE}/brands/${id}`, { method: "DELETE" });
  return res.json();
}

export async function deleteShop(id) {
  const res = await fetch(`${API_BASE}/shops/${id}`, { method: "DELETE" });
  return res.json();
}