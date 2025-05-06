export interface User {
  id: string;
  name: string;
  role: "leader" | "user";
}

export const users: User[] = [
  { id: "1", name: "Leader X", role: "leader" },
  { id: "2", name: "User A", role: "user" },
  { id: "3", name: "User B", role: "user" },
];
