const ACCESS_TOKEN_KEYS = ["token", "access_token", "authToken"];

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL = configuredBaseUrl && configuredBaseUrl.length > 0
  ? configuredBaseUrl
  : "http://localhost:8080";

type ApiErrorShape = {
  error?: string;
  message?: string;
  details?: string;
};

export const getAccessToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  for (const key of ACCESS_TOKEN_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value) {
      return value;
    }
  }

  const cookieToken = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("token="))
    ?.split("=")[1];

  return cookieToken ? decodeURIComponent(cookieToken) : null;
};

const parseApiError = async (response: Response) => {
  let body: ApiErrorShape | null = null;

  try {
    body = (await response.json()) as ApiErrorShape;
  } catch {
    body = null;
  }

  return body?.error || body?.message || body?.details || `Request failed (${response.status})`;
};

export const requestWithAuth = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No auth token found. Please sign in again.");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
