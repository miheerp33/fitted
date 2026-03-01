const API_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(accessToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

export async function uploadItem(accessToken, file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function getWardrobe(accessToken) {
  const res = await fetch(`${API_URL}/api/wardrobe`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function deleteWardrobeItem(accessToken, id) {
  const res = await fetch(`${API_URL}/api/wardrobe/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function updateWardrobeItem(accessToken, id, { is_available, pinned }) {
  const body = {};
  if (typeof is_available === 'boolean') body.is_available = is_available;
  if (typeof pinned === 'boolean') body.pinned = pinned;
  if (Object.keys(body).length === 0) return { item: null };
  const res = await fetch(`${API_URL}/api/wardrobe/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function getRecommendation(accessToken, { lat, lon, city, occasion, style }) {
  const res = await fetch(`${API_URL}/api/recommend`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ lat, lon, city, occasion, style }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function getMoodBoard(accessToken, { itemIds, weatherContext }) {
  const res = await fetch(`${API_URL}/api/moodboard`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ itemIds, weatherContext }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function submitOutfitFeedback(accessToken, { occasion, weatherSummary, selectedIds, reason, rating }) {
  const res = await fetch(`${API_URL}/api/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ occasion, weatherSummary, selectedIds, reason, rating }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function saveOutfit(accessToken, { selectedIds, weatherSummary, city, occasion, explanation, items }) {
  const res = await fetch(`${API_URL}/api/outfits`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ selectedIds, weatherSummary, city, occasion, explanation, items }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function getSavedOutfits(accessToken) {
  const res = await fetch(`${API_URL}/api/outfits`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function deleteSavedOutfit(accessToken, outfitId) {
  const res = await fetch(`${API_URL}/api/outfits/${encodeURIComponent(outfitId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
}

export async function getSharedOutfit(shareId) {
  const res = await fetch(`${API_URL}/api/share/${encodeURIComponent(shareId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}
