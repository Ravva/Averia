import "server-only";
import { Client, TablesDB, Users, Account, Messaging, ID } from "node-appwrite";

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "averia";

export const TABLES = {
  profiles: "profiles",
  classes: "classes",
  invites: "invites",
  snapshots: "snapshots",
} as const;

const REQUEST_TIMEOUT_MS = 5000;

/**
 * The function runtime reaches Appwrite through Cloudflare, and a reused
 * keep-alive socket there occasionally hangs until the 30s function timeout.
 * Closing the connection per request plus a client-side deadline keeps every
 * call inside the platform limit.
 */
function client(): Client {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) {
    throw new Error(
      "Не заданы APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID или APPWRITE_API_KEY. Проверьте .env.local.",
    );
  }
  const appwrite = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const prepareRequest = appwrite.prepareRequest.bind(appwrite);
  appwrite.prepareRequest = (method, url, headers = {}, params = {}) => {
    const { uri, options } = prepareRequest(method, url, headers, params);
    options.headers = { ...options.headers, connection: "close" };
    options.signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    return { uri, options };
  };
  return appwrite;
}

export function tablesDb(): TablesDB {
  return new TablesDB(client());
}

export function usersApi(): Users {
  return new Users(client());
}

export function accountApi(): Account {
  return new Account(client());
}

export function messagingApi(): Messaging {
  return new Messaging(client());
}

/**
 * A dropped socket is not a failed operation, so transient network errors are
 * retried before the error reaches the route.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts) {
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
      }
    }
  }
  throw lastError;
}

export { ID };
