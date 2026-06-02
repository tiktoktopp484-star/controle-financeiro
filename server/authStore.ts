import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const USERS_FILE = join(DATA_DIR, "users.json");

export type StoredUser = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  premium: boolean;
  premiumUntil: string | null;
  trialUsed: boolean;
  paymentReceiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
};

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readUsers(): StoredUser[] {
  ensureDataDir();
  if (!existsSync(USERS_FILE)) {
    writeFileSync(USERS_FILE, "[]", "utf-8");
    return [];
  }
  try {
    return JSON.parse(readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  ensureDataDir();
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

let _nextId = 1;

function fromDbRow(row: typeof users.$inferSelect): StoredUser {
  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email ?? "",
    passwordHash: row.passwordHash ?? "",
    role: row.role,
    premium: row.premium,
    premiumUntil: row.premiumUntil?.toISOString() ?? null,
    trialUsed: row.trialUsed,
    paymentReceiptUrl: row.paymentReceiptUrl ?? null,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    lastSignedIn: row.lastSignedIn?.toISOString() ?? new Date().toISOString(),
  };
}

export async function getUserByEmail(email: string): Promise<StoredUser | undefined> {
  const db = await getDb();
  if (db) {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length > 0 && rows[0].passwordHash) {
      return fromDbRow(rows[0]);
    }
  }
  return readUsers().find((u) => u.email === email);
}

export function getUserById(id: number): StoredUser | undefined {
  return readUsers().find((u) => u.id === id);
}

export async function registerUser(name: string, email: string, password: string): Promise<StoredUser> {
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error("Email já cadastrado");
  }

  const hash = hashPassword(password);
  const now = new Date();
  const db = await getDb();

  if (db) {
    const isFirst = (await db.select().from(users)).length === 0;
    const result = await db.insert(users).values({
      openId: email,
      name,
      email,
      passwordHash: hash,
      loginMethod: "local",
      role: isFirst ? "admin" : "user",
      lastSignedIn: now,
    });
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length > 0) {
      return fromDbRow(rows[0]);
    }
  }

  const fileUsers = readUsers();
  if (fileUsers.length > 0) {
    _nextId = Math.max(...fileUsers.map((u) => u.id)) + 1;
  }
  const nowStr = now.toISOString();
  const isFirst = fileUsers.length === 0;
  const user: StoredUser = {
    id: _nextId++,
    name,
    email,
    passwordHash: hash,
    role: isFirst ? "admin" : "user",
    premium: false,
    premiumUntil: null,
    trialUsed: false,
    paymentReceiptUrl: null,
    createdAt: nowStr,
    updatedAt: nowStr,
    lastSignedIn: nowStr,
  };
  fileUsers.push(user);
  writeUsers(fileUsers);
  return user;
}

export async function authenticateUser(email: string, password: string): Promise<StoredUser | null> {
  const db = await getDb();
  if (db) {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length > 0 && rows[0].passwordHash) {
      if (!verifyPassword(password, rows[0].passwordHash)) return null;
      const now = new Date();
      await db.update(users).set({ lastSignedIn: now }).where(eq(users.id, rows[0].id));
      return fromDbRow({ ...rows[0], lastSignedIn: now });
    }
  }

  const user = readUsers().find((u) => u.email === email);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  user.lastSignedIn = new Date().toISOString();
  const fileUsers = readUsers();
  const idx = fileUsers.findIndex((u) => u.id === user.id);
  if (idx !== -1) {
    fileUsers[idx] = user;
    writeUsers(fileUsers);
  }

  return user;
}

export async function updateLocalUserPremium(
  email: string,
  premium: boolean,
  premiumUntil: string | null
): Promise<StoredUser | null> {
  const db = await getDb();
  if (db) {
    await db
      .update(users)
      .set({
        premium,
        premiumUntil: premiumUntil ? new Date(premiumUntil) : null,
      })
      .where(eq(users.email, email));
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length > 0) return fromDbRow(rows[0]);
    return null;
  }

  const fileUsers = readUsers();
  const idx = fileUsers.findIndex((u) => u.email === email);
  if (idx === -1) return null;
  fileUsers[idx].premium = premium;
  fileUsers[idx].premiumUntil = premiumUntil;
  writeUsers(fileUsers);
  return fileUsers[idx];
}

export async function markTrialUsed(email: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db
      .update(users)
      .set({ trialUsed: true })
      .where(eq(users.email, email));
    return;
  }

  const fileUsers = readUsers();
  const idx = fileUsers.findIndex((u) => u.email === email);
  if (idx === -1) return;
  fileUsers[idx].trialUsed = true;
  writeUsers(fileUsers);
}

export async function updateUserPaymentReceipt(email: string, paymentReceiptUrl: string): Promise<StoredUser | null> {
  const db = await getDb();
  if (db) {
    await db
      .update(users)
      .set({ paymentReceiptUrl })
      .where(eq(users.email, email));
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length > 0) return fromDbRow(rows[0]);
    return null;
  }

  const fileUsers = readUsers();
  const idx = fileUsers.findIndex((u) => u.email === email);
  if (idx === -1) return null;
  fileUsers[idx].paymentReceiptUrl = paymentReceiptUrl;
  writeUsers(fileUsers);
  return fileUsers[idx];
}

export async function updateLocalUserRole(email: string, role: "user" | "admin"): Promise<StoredUser | null> {
  const db = await getDb();
  if (db) {
    await db.update(users).set({ role }).where(eq(users.email, email));
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length > 0) return fromDbRow(rows[0]);
  }

  const fileUsers = readUsers();
  const idx = fileUsers.findIndex((u) => u.email === email);
  if (idx === -1) return null;
  fileUsers[idx].role = role;
  writeUsers(fileUsers);
  return fileUsers[idx];
}

export async function deleteUserByEmail(email: string): Promise<boolean> {
  const db = await getDb();
  if (db) {
    const result = await db.delete(users).where(eq(users.email, email));
    if (result) return true;
  }

  const fileUsers = readUsers();
  const idx = fileUsers.findIndex((u) => u.email === email);
  if (idx === -1) return false;
  fileUsers.splice(idx, 1);
  writeUsers(fileUsers);
  return true;
}
