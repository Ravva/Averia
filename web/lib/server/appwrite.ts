import "server-only";
import { Client, TablesDB, Users, Account, ID } from "node-appwrite";

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "averia";

export const TABLES = {
  profiles: "profiles",
  classes: "classes",
  invites: "invites",
  snapshots: "snapshots",
} as const;

function client(): Client {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) {
    throw new Error(
      "Не заданы APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID или APPWRITE_API_KEY. Проверьте .env.local.",
    );
  }
  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
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

export { ID };
