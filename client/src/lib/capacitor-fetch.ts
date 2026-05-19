import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

function toRecord(headers: HeadersInit | undefined): Record<string, string> {
  const r: Record<string, string> = {};
  if (!headers) return r;
  if (headers instanceof Headers) {
    headers.forEach((v, k) => { r[k] = v; });
  } else if (Array.isArray(headers)) {
    headers.forEach(([k, v]) => { r[k] = v; });
  } else {
    Object.assign(r, headers);
  }
  return r;
}

export async function capacitorFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { __internalAbort?: AbortSignal },
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method ?? 'GET';
  const headers = toRecord(init?.headers);
  const body = init?.body?.toString();

  let data: unknown = undefined;
  const ct = headers['content-type']?.toLowerCase() ?? '';
  if (body && ct.includes('json')) {
    try { data = JSON.parse(body); } catch { data = body; }
  } else {
    data = body;
  }

  const nativeResponse = await CapacitorHttp.request({
    url,
    method,
    headers,
    data,
  });

  const responseHeaders = new Headers();
  if (nativeResponse.headers) {
    Object.entries(nativeResponse.headers).forEach(([k, v]) => {
      responseHeaders.set(k, String(v));
    });
  }

  const bodyStr = typeof nativeResponse.data === 'string'
    ? nativeResponse.data
    : JSON.stringify(nativeResponse.data);

  return new Response(bodyStr, {
    status: nativeResponse.status,
    statusText: nativeResponse.status >= 200 && nativeResponse.status < 300 ? 'OK' : 'Error',
    headers: responseHeaders,
  });
}

export async function platformFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    return await globalThis.fetch(input, {
      ...(init ?? {}),
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    if (!Capacitor.isNativePlatform()) throw err;

    console.warn("[fetch] standard fetch failed, trying Capacitor native HTTP:", err);
    clearTimeout(timeout);

    const headers = toRecord(init?.headers);

    const body = init?.body?.toString();
    let data: unknown = undefined;
    const ct = headers['content-type']?.toLowerCase() ?? '';
    if (body && ct.includes('json')) {
      try { data = JSON.parse(body); } catch { data = body; }
    } else if (body) {
      data = body;
    }

    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';

    const nativeResponse = await CapacitorHttp.request({ url, method, headers, data });

    const responseHeaders = new Headers();
    if (nativeResponse.headers) {
      Object.entries(nativeResponse.headers).forEach(([k, v]) => {
        responseHeaders.set(k, String(v));
      });
    }

    const bodyStr = typeof nativeResponse.data === 'string'
      ? nativeResponse.data
      : JSON.stringify(nativeResponse.data);

    return new Response(bodyStr, {
      status: nativeResponse.status,
      statusText: nativeResponse.status >= 200 && nativeResponse.status < 300 ? 'OK' : 'Error',
      headers: responseHeaders,
    });
  } finally {
    clearTimeout(timeout);
  }
}
