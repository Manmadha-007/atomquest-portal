const DEFAULT_APP_BASE_URL = "http://localhost:3000";

function normalizeBaseUrl(value: string | undefined) {
  const candidate = (value?.trim() || DEFAULT_APP_BASE_URL).replace(/\/+$/, "");

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return DEFAULT_APP_BASE_URL;
    }

    return candidate;
  } catch {
    return DEFAULT_APP_BASE_URL;
  }
}

function normalizeAppPath(path: string) {
  const trimmedPath = path.trim();

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmedPath)) {
    throw new Error("createAppUrl expects an application-relative path.");
  }

  const hashIndex = trimmedPath.indexOf("#");
  const pathWithoutHash =
    hashIndex >= 0 ? trimmedPath.slice(0, hashIndex) : trimmedPath;
  const hash = hashIndex >= 0 ? trimmedPath.slice(hashIndex) : "";
  const queryIndex = pathWithoutHash.indexOf("?");
  const rawPathname =
    queryIndex >= 0 ? pathWithoutHash.slice(0, queryIndex) : pathWithoutHash;
  const query = queryIndex >= 0 ? pathWithoutHash.slice(queryIndex) : "";
  const pathname = `/${rawPathname.replace(/^\/+/, "").replace(/\/{2,}/g, "/")}`;

  return `${pathname}${query}${hash}`;
}

export function getAppBaseUrl() {
  return normalizeBaseUrl(process.env.APP_BASE_URL);
}

export function createAppUrl(path: string) {
  return `${getAppBaseUrl()}${normalizeAppPath(path)}`;
}
