const BASE_URL = 'https://localhost:7199/api';

export async function getAllStops() {
    const response = await fetch(`${BASE_URL}/stops/all`);
    if (!response.ok) {
        throw new Error("Failed to fetch stops");
    }
    return response.json();
}