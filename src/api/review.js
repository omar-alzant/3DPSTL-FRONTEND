const API = process.env.REACT_APP_API_URL;

export async function submitRating(itemId, rate, token) {
  return fetch(`${API}/api/items/${itemId}/rating`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ rate })
  }).then(r => r.json());
}

export async function submitComment(itemId, comment, token) {
  return fetch(`${API}/api/items/${itemId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ comment })
  }).then(r => r.json());
}
