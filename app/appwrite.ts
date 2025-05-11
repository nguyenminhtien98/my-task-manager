import { Client, Account, Databases } from "appwrite";

const client = new Client()
  .setEndpoint(String(process.env.NEXT_PUBLIC_APPWRITE_URL))
  .setProject(String(process.env.NEXT_PUBLIC_PROJECT_ID));

export const account = new Account(client);
export const database = new Databases(client);

// subscribeToRealtime
export const subscribeToRealtime = (
  channels: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (payload: any) => void
) => {
  return client.subscribe(channels, callback);
};
