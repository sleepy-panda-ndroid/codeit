type Judge0CreateSubmissionInput = {
  source_code: string;
  language_id: number;
  stdin?: string;
};

type Judge0CreateSubmissionResponse = {
  token: string;
};

type Judge0Status = {
  id: number;
  description: string;
};

export type Judge0SubmissionResult = {
  token: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: Judge0Status;
  time: string | null;
  memory: number | null;
  exit_code?: number | null;
};

function getJudge0BaseUrl() {
  const baseUrl = process.env.JUDGE0_BASE_URL;
  if (!baseUrl) {
    throw new Error("JUDGE0_BASE_URL missing in .env");
  }
  return baseUrl.replace(/\/+$/, "");
}

function getJudge0Headers(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const baseUrl = getJudge0BaseUrl();

  const apiKey = process.env.JUDGE0_API_KEY?.trim();
  const apiHost = process.env.JUDGE0_API_HOST?.trim();

  const isRapidApi = baseUrl.includes("rapidapi.com");

  if (isRapidApi) {
    if (!apiKey || !apiHost) {
      throw new Error(
        "RapidAPI Judge0 requires JUDGE0_API_KEY and JUDGE0_API_HOST"
      );
    }

    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-RapidAPI-Host"] = apiHost;
  }

  return headers;
}


async function judge0Fetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getJudge0BaseUrl();
  const headers = {
    ...getJudge0Headers(),
    ...(init?.headers || {}),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);

      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeout);
      const text = await res.text();

      if (!res.ok) {
        try {
          const data = JSON.parse(text);
          const message =
            data?.message || data?.error || text || `Judge0 request failed with HTTP ${res.status}`;
          throw new Error(message);
        } catch {
          throw new Error(text || `Judge0 request failed with HTTP ${res.status}`);
        }
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error("Judge0 returned non-JSON response");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Judge0 request failed";
      lastError = new Error(message);

      if (attempt === 2) break;

      const isTransient = /fetch failed|network|timeout|temporarily unavailable|429|5\d\d/i.test(message);
      if (!isTransient) break;

      await sleep(800 * (attempt + 1));
    }
  }

  throw lastError ?? new Error("Judge0 execution service is temporarily unavailable");
}

export async function createSubmission(
  input: Judge0CreateSubmissionInput
): Promise<Judge0CreateSubmissionResponse> {
  return judge0Fetch<Judge0CreateSubmissionResponse>(
    "/submissions?base64_encoded=false&wait=false",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function getSubmission(
  token: string
): Promise<Judge0SubmissionResult> {
  return judge0Fetch<Judge0SubmissionResult>(
    `/submissions/${token}?base64_encoded=false`
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollSubmission(
  token: string,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
  }
): Promise<Judge0SubmissionResult> {
  const maxAttempts = options?.maxAttempts ?? 10;
  const intervalMs = options?.intervalMs ?? 700;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getSubmission(token);

    // 1 = In Queue, 2 = Processing, >2 = finished
    if (result.status && result.status.id > 2) {
      return result;
    }

    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }

  throw new Error("Execution timed out while waiting for Judge0 result");
}