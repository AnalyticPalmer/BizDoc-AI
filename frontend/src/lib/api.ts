const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
}

export async function getApiHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `BizDoctor API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<HealthResponse>;
}