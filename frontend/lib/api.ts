import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiGet(path: string) {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(path: string, body: unknown) {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPatch(path: string, body: unknown) {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDelete(path: string) {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUploadResume(file: File, label?: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const formData = new FormData();
  formData.append("file", file);
  if (label) formData.append("label", label);

  const res = await fetch(`${API_URL}/profile/resumes`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}