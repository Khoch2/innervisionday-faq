const API =
  import.meta.env.VITE_API_URL ||
  window.location.origin;

export async function getSpeakers() {
  const r = await fetch(`${API}/api/speakers`);
  return r.json();
}

export async function getQuestions(speaker) {
  const r = await fetch(`${API}/api/questions?speaker=${encodeURIComponent(speaker)}`);
  return r.json();
}

export async function postQuestion({ speaker, text }) {
  const r = await fetch(`${API}/api/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speaker, text })
  });
  return r.json();
}

export async function approveQuestion({ id, approved }) {
  const r = await fetch(`${API}/api/mod/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, approved })
  });
  return r.json();
}

export async function deleteQuestion(id) {
  const r = await fetch(`${API}/api/questions/${id}`, { method: "DELETE" });
  return r.json();
}

export async function voteQuestion(id) {
  const r = await fetch(`${API}/api/questions/${id}/vote`, {
    method: "POST"
  });
  return r.json();
}

export async function unvoteQuestion(id) {
  const r = await fetch(`${API}/api/questions/${id}/unvote`, {
    method: "POST"
  });
  return r.json();
}
