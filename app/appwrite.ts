import { Client, Account, Databases } from "appwrite";

const client = new Client()
  .setEndpoint(String(process.env.NEXT_PUBLIC_APPWRITE_URL))
  .setProject(String(process.env.NEXT_PUBLIC_PROJECT_ID));

export const account = new Account(client);
export const database = new Databases(client);
