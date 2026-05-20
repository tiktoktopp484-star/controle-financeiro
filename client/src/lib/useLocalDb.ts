import { useLiveQuery } from "dexie-react-hooks";
import db, {
  getSalaries, addSalary, deleteSalary,
  getExpenses, addExpense, updateExpenseReceipt, deleteExpense,
  getIncomes, addIncome, deleteIncome,
  getDebts, addDebt, toggleDebtPaid, deleteDebt,
  getCards, addCard, deleteCard,
  getGoals, addGoal, depositGoal, toggleGoalCompleted, deleteGoal,
  clearAllData,
} from "./db";

export function useSalaries() {
  const data = useLiveQuery(() => getSalaries()) ?? [];
  const loading = data === null;
  return { data, loading, addSalary, deleteSalary };
}

export function useExpenses() {
  const data = useLiveQuery(() => getExpenses()) ?? [];
  const loading = data === null;
  return { data, loading, addExpense, updateExpenseReceipt, deleteExpense };
}

export function useIncomes() {
  const data = useLiveQuery(() => getIncomes()) ?? [];
  const loading = data === null;
  return { data, loading, addIncome, deleteIncome };
}

export function useDebts() {
  const data = useLiveQuery(() => getDebts()) ?? [];
  const loading = data === null;
  return { data, loading, addDebt, toggleDebtPaid, deleteDebt };
}

export function useCards() {
  const data = useLiveQuery(() => getCards()) ?? [];
  const loading = data === null;
  return { data, loading, addCard, deleteCard };
}

export function useGoals() {
  const data = useLiveQuery(() => getGoals()) ?? [];
  const loading = data === null;
  return { data, loading, addGoal, depositGoal, toggleGoalCompleted, deleteGoal };
}

export { clearAllData };
