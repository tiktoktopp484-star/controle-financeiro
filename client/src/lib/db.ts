import Dexie, { type EntityTable } from "dexie";

export interface Salary {
  id: number;
  value: number;
  description: string;
  date: string;
  createdAt: Date;
}

export interface Expense {
  id: number;
  description: string;
  value: number;
  category: string;
  date: string;
  customCategory: string | null;
  receiptUrl: string | null;
  createdAt: Date;
}

export interface Income {
  id: number;
  description: string;
  value: number;
  date: string;
  createdAt: Date;
}

export interface Debt {
  id: number;
  description: string;
  value: number;
  type: string;
  dueDate: string;
  paid: boolean;
  createdAt: Date;
}

export interface Card {
  id: number;
  description: string;
  value: number;
  flag: string;
  installments: number;
  creditLimit: number;
  date: string;
  createdAt: Date;
}

export interface Goal {
  id: number;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: Date;
}

class FinanceDB extends Dexie {
  salaries!: EntityTable<Salary, "id">;
  expenses!: EntityTable<Expense, "id">;
  incomes!: EntityTable<Income, "id">;
  debts!: EntityTable<Debt, "id">;
  cards!: EntityTable<Card, "id">;
  goals!: EntityTable<Goal, "id">;

  constructor() {
    super("controle-financeiro");
    this.version(1).stores({
      salaries: "++id, date",
      expenses: "++id, date, category",
      incomes: "++id, date",
      debts: "++id, dueDate, paid",
      cards: "++id, date, flag",
      goals: "++id, category, completed",
    });
  }
}

const db = new FinanceDB();
export default db;

export async function getSalaries() {
  return db.salaries.orderBy("date").reverse().toArray();
}

export async function addSalary(value: number, description: string, date: string) {
  return db.salaries.add({ value, description, date, createdAt: new Date() });
}

export async function deleteSalary(id: number) {
  return db.salaries.delete(id);
}

export async function getExpenses() {
  return db.expenses.orderBy("date").reverse().toArray();
}

export async function addExpense(description: string, value: number, category: string, date: string) {
  return db.expenses.add({
    description, value, category, date,
    customCategory: null, receiptUrl: null, createdAt: new Date(),
  });
}

export async function updateExpenseReceipt(id: number, receiptUrl: string | null) {
  return db.expenses.update(id, { receiptUrl });
}

export async function deleteExpense(id: number) {
  return db.expenses.delete(id);
}

export async function getIncomes() {
  return db.incomes.orderBy("date").reverse().toArray();
}

export async function addIncome(description: string, value: number, date: string) {
  return db.incomes.add({ description, value, date, createdAt: new Date() });
}

export async function deleteIncome(id: number) {
  return db.incomes.delete(id);
}

export async function getDebts() {
  return db.debts.orderBy("dueDate").toArray();
}

export async function addDebt(description: string, value: number, type: string, dueDate: string) {
  return db.debts.add({ description, value, type, dueDate, paid: false, createdAt: new Date() });
}

export async function toggleDebtPaid(id: number, paid: boolean) {
  return db.debts.update(id, { paid });
}

export async function deleteDebt(id: number) {
  return db.debts.delete(id);
}

export async function getCards() {
  return db.cards.orderBy("date").reverse().toArray();
}

export async function addCard(description: string, value: number, flag: string, installments: number, creditLimit: number, date: string) {
  return db.cards.add({ description, value, flag, installments, creditLimit, date, createdAt: new Date() });
}

export async function deleteCard(id: number) {
  return db.cards.delete(id);
}

export async function getGoals() {
  return db.goals.orderBy("createdAt").reverse().toArray();
}

export async function addGoal(name: string, description: string, targetAmount: number, category: string, dueDate: string | null) {
  return db.goals.add({ name, description, targetAmount, currentAmount: 0, category, dueDate, completed: false, createdAt: new Date() });
}

export async function depositGoal(id: number, amount: number) {
  const goal = await db.goals.get(id);
  if (!goal) throw new Error("Goal not found");
  const newAmount = goal.currentAmount + amount;
  const completed = newAmount >= goal.targetAmount;
  await db.goals.update(id, { currentAmount: newAmount, completed });
  return { completed, newAmount };
}

export async function toggleGoalCompleted(id: number, completed: boolean) {
  return db.goals.update(id, { completed });
}

export async function deleteGoal(id: number) {
  return db.goals.delete(id);
}

export async function clearAllData() {
  await Promise.all([
    db.salaries.clear(),
    db.expenses.clear(),
    db.incomes.clear(),
    db.debts.clear(),
    db.cards.clear(),
    db.goals.clear(),
  ]);
}
