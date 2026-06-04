const API_URL = "http://digitalworkplacetestapi.runasp.net/api";

export async function recordScan(qrCode: string) {
  const response = await fetch(`${API_URL}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrCode }),
  });

  if (!response.ok) {
    throw new Error("Failed to record scan");
  }

  return response.json();
}
