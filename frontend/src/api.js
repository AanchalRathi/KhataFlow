const API_BASE = "http://localhost:8000"; // update to your Render URL when deployed

export async function uploadInvoice(file, docType) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", docType);
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