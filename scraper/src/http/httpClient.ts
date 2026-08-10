export interface HttpResponse {
  body: string;
  status: number;
  url: URL;
}

export interface HttpClient {
  get(url: URL): Promise<HttpResponse>;
}

export interface FetchHttpClientOptions {
  timeoutMs: number;
  retries: number;
  userAgent: string;
  maxResponseBytes?: number;
  fetchImplementation?: typeof fetch;
  wait?: (milliseconds: number) => Promise<void>;
}

export class HttpRequestError extends Error {
  constructor(
    message: string,
    readonly url: URL,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export class FetchHttpClient implements HttpClient {
  private readonly fetchImplementation: typeof fetch;
  private readonly wait: (milliseconds: number) => Promise<void>;
  private readonly maxResponseBytes: number;

  constructor(private readonly options: FetchHttpClientOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.wait =
      options.wait ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.maxResponseBytes = options.maxResponseBytes ?? 5_000_000;
  }

  async get(url: URL): Promise<HttpResponse> {
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new HttpRequestError('El conector sólo admite URLs HTTP o HTTPS.', url);
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.options.retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
      try {
        const response = await this.fetchImplementation(url, {
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'User-Agent': this.options.userAgent,
          },
        });
        const contentLength = Number(response.headers.get('content-length') ?? 0);
        if (contentLength > this.maxResponseBytes) {
          throw new HttpRequestError(
            'La respuesta supera el tamaño máximo permitido.',
            url,
            response.status,
          );
        }
        if (!response.ok) {
          const error = new HttpRequestError(
            `La fuente respondió HTTP ${response.status}.`,
            url,
            response.status,
          );
          if (!isRetryableStatus(response.status) || attempt === this.options.retries) throw error;
          lastError = error;
        } else {
          const body = await response.text();
          if (Buffer.byteLength(body, 'utf8') > this.maxResponseBytes) {
            throw new HttpRequestError(
              'La respuesta supera el tamaño máximo permitido.',
              url,
              response.status,
            );
          }
          return { body, status: response.status, url: new URL(response.url || url.href) };
        }
      } catch (error) {
        lastError = error;
        const status = error instanceof HttpRequestError ? error.status : undefined;
        if (
          (status !== undefined && !isRetryableStatus(status)) ||
          attempt === this.options.retries
        ) {
          if (error instanceof HttpRequestError) throw error;
          throw new HttpRequestError(
            error instanceof Error ? error.message : 'No fue posible consultar la fuente.',
            url,
          );
        }
      } finally {
        clearTimeout(timeout);
      }

      await this.wait(300 * 2 ** attempt);
    }

    throw new HttpRequestError(
      lastError instanceof Error ? lastError.message : 'No fue posible consultar la fuente.',
      url,
    );
  }
}
