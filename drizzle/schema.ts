import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  premium: boolean("premium").default(false).notNull(),
  premiumUntil: timestamp("premiumUntil"),
  trialUsed: boolean("trialUsed").default(false).notNull(),
  paymentReceiptUrl: text("paymentReceiptUrl"),
  asaasCustomerId: varchar("asaasCustomerId", { length: 64 }),
  asaasSubscriptionId: varchar("asaasSubscriptionId", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Salários
export const salaries = mysqlTable("salaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  description: varchar("description", { length: 255 }).default("Salário"),
  date: date("date").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Salary = typeof salaries.$inferSelect;
export type InsertSalary = typeof salaries.$inferInsert;

// Despesas
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).default("Outros").notNull(),
  date: date("date").notNull(),
  customCategory: varchar("customCategory", { length: 100 }),
  receiptUrl: text("receiptUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// Receitas extras
export const incomes = mysqlTable("incomes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Income = typeof incomes.$inferSelect;
export type InsertIncome = typeof incomes.$inferInsert;

// Dívidas
export const debts = mysqlTable("debts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  type: mysqlEnum("type", [
    "Empréstimo",
    "Cartão",
    "Boleto",
    "Pessoa Física",
    "Financiamento",
    "Outros",
  ])
    .default("Outros")
    .notNull(),
  dueDate: date("dueDate").notNull(),
  paid: boolean("paid").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Debt = typeof debts.$inferSelect;
export type InsertDebt = typeof debts.$inferInsert;

// Cartão de crédito
export const cards = mysqlTable("cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  flag: mysqlEnum("flag", ["Visa", "Mastercard", "Elo", "Hipercard"])
    .default("Visa")
    .notNull(),
  installments: int("installments").default(1).notNull(),
  creditLimit: decimal("creditLimit", { precision: 15, scale: 2 }).default("0").notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Card = typeof cards.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;

// Metas de poupanca
export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetAmount: decimal("targetAmount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("currentAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  category: mysqlEnum("category", [
    "Viagem",
    "Casa",
    "Carro",
    "Educacao",
    "Saude",
    "Lazer",
    "Outros",
  ])
    .default("Outros")
    .notNull(),
  dueDate: date("dueDate"),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

// Categorias personalizadas (Premium)
export const customCategories = mysqlTable("custom_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomCategory = typeof customCategories.$inferSelect;
export type InsertCustomCategory = typeof customCategories.$inferInsert;

// Orçamentos mensais (Premium)
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  spendingLimit: decimal("spendingLimit", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;
