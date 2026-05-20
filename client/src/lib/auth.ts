const SESSION_KEY = "app_session";
const USER_KEY = "app_user_data";

interface UserData {
  name: string;
  email: string;
  passwordHash: string;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "financeiro-salt");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getUsers(): UserData[] {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: UserData[]): void {
  localStorage.setItem(USER_KEY, JSON.stringify(users));
}

export async function register(name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!name.trim() || !email.trim() || !password) return { ok: false, error: "Preencha todos os campos" };
  if (password.length < 4) return { ok: false, error: "Senha deve ter no mínimo 4 caracteres" };
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return { ok: false, error: "Email já cadastrado" };
  users.push({ name: name.trim(), email: email.toLowerCase(), passwordHash: await hashPassword(password) });
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, "true");
  return { ok: true };
}

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string; name?: string }> {
  const users = getUsers();
  const user = users.find(u => u.email === email.toLowerCase());
  if (!user) return { ok: false, error: "Email não cadastrado" };
  if ((await hashPassword(password)) !== user.passwordHash) return { ok: false, error: "Senha incorreta" };
  localStorage.setItem(SESSION_KEY, "true");
  return { ok: true, name: user.name };
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(SESSION_KEY) === "true";
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function getUserName(): Promise<string> {
  const users = getUsers();
  if (users.length > 0) return users[0].name;
  return "";
}
