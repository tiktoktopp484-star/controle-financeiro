import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  cards,
  debts,
  expenses,
  goals,
  incomes,
  InsertUser,
  salaries,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      const sslParam = parsed.searchParams.get("ssl");
      _db = drizzle({
        connection: {
          host: parsed.hostname,
          port: Number(parsed.port),
          user: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password),
          database: parsed.pathname.slice(1),
          ssl: sslParam === "true" ? {} : sslParam ? JSON.parse(sslParam) : undefined,
          pool: {
            connectionLimit: 5,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
          },
        },
      });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function disableExpiredPremium(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ premiumUntil: users.premiumUntil }).from(users).where(eq(users.id, userId)).limit(1);
  if (result.length === 0) return false;
  const until = result[0].premiumUntil;
  if (until && new Date(until) <= new Date()) {
    await db.update(users).set({ premium: false, premiumUntil: null }).where(eq(users.id, userId));
    return true;
  }
  return false;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── SALÁRIOS ──────────────────────────────────────────────────────────────────
export async function getSalariesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(salaries).where(eq(salaries.userId, userId));
}

export async function addSalary(userId: number, value: string, description: string, date: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(salaries).values({ userId, value, description, date: new Date(date) });
}

export async function deleteSalary(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(salaries).where(and(eq(salaries.id, id), eq(salaries.userId, userId)));
}

// ── DESPESAS ──────────────────────────────────────────────────────────────────
export async function getExpensesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses).where(eq(expenses.userId, userId));
}

export async function addExpense(
  userId: number,
  description: string,
  value: string,
  category: typeof expenses.$inferInsert["category"],
  date: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(expenses).values({ userId, description, value, category, date: new Date(date) });
  return { id: Number(result[0].insertId) };
}

export async function updateExpenseReceipt(id: number, userId: number, receiptUrl: string | null) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(expenses).set({ receiptUrl }).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

export async function deleteExpense(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

// ── RECEITAS ──────────────────────────────────────────────────────────────────
export async function getIncomesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incomes).where(eq(incomes.userId, userId));
}

export async function addIncome(userId: number, description: string, value: string, date: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(incomes).values({ userId, description, value, date: new Date(date) });
}

export async function deleteIncome(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId)));
}

// ── DÍVIDAS ───────────────────────────────────────────────────────────────────
export async function getDebtsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(debts).where(eq(debts.userId, userId));
}

export async function addDebt(
  userId: number,
  description: string,
  value: string,
  type: typeof debts.$inferInsert["type"],
  dueDate: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(debts).values({ userId, description, value, type, dueDate: new Date(dueDate), paid: false });
}

export async function toggleDebtPaid(id: number, userId: number, paid: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(debts).set({ paid }).where(and(eq(debts.id, id), eq(debts.userId, userId)));
}

export async function deleteDebt(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId)));
}

// ── CARTÃO ────────────────────────────────────────────────────────────────────
export async function getCardsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cards).where(eq(cards.userId, userId));
}

export async function addCard(
  userId: number,
  description: string,
  value: string,
  flag: typeof cards.$inferInsert["flag"],
  installments: number,
  creditLimit: string,
  date: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(cards).values({ userId, description, value, flag, installments, creditLimit, date: new Date(date) });
}

export async function deleteCard(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(cards).where(and(eq(cards.id, id), eq(cards.userId, userId)));
}

// ── METAS ─────────────────────────────────────────────────────────────────────
export async function getGoalsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(goals).where(eq(goals.userId, userId));
}

export async function addGoal(
  userId: number,
  name: string,
  description: string,
  targetAmount: string,
  category: typeof goals.$inferInsert["category"],
  dueDate: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(goals).values({
    userId,
    name,
    description,
    targetAmount,
    category,
    dueDate: dueDate ? new Date(dueDate) : null,
    currentAmount: "0",
    completed: false,
  });
}

export async function updateGoal(
  id: number,
  userId: number,
  name: string,
  description: string,
  targetAmount: string,
  category: typeof goals.$inferInsert["category"],
  dueDate: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(goals)
    .set({
      name,
      description,
      targetAmount,
      category,
      dueDate: dueDate ? new Date(dueDate) : null,
    })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
}

export async function depositGoal(id: number, userId: number, amount: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const goal = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId))).limit(1);
  if (!goal.length) throw new Error("Goal not found");
  const newAmount = parseFloat(goal[0].currentAmount.toString()) + parseFloat(amount);
  const isCompleted = newAmount >= parseFloat(goal[0].targetAmount.toString());
  await db
    .update(goals)
    .set({ currentAmount: newAmount.toString(), completed: isCompleted })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  return { completed: isCompleted, newAmount };
}

export async function toggleGoalCompleted(id: number, userId: number, completed: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(goals).set({ completed }).where(and(eq(goals.id, id), eq(goals.userId, userId)));
}

export async function deleteGoal(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
}
