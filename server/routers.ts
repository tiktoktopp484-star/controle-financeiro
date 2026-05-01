import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addCard,
  addDebt,
  addExpense,
  addIncome,
  addSalary,
  deleteCard,
  deleteDebt,
  deleteExpense,
  deleteIncome,
  deleteSalary,
  getCardsByUser,
  getDebtsByUser,
  getExpensesByUser,
  getIncomesByUser,
  getSalariesByUser,
  toggleDebtPaid,
} from "./db";

const expenseCategories = [
  "Alimentação",
  "Transporte",
  "Saúde",
  "Lazer",
  "Educação",
  "Casa",
  "Outros",
] as const;

const debtTypes = [
  "Empréstimo",
  "Cartão",
  "Boleto",
  "Pessoa Física",
  "Financiamento",
  "Outros",
] as const;

const cardFlags = ["Visa", "Mastercard", "Elo", "Hipercard"] as const;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── SALÁRIOS ────────────────────────────────────────────────────────────────
  salaries: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await getSalariesByUser(ctx.user.id);
      return rows.map((r) => ({
        ...r,
        value: parseFloat(r.value as unknown as string),
        date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
      }));
    }),

    add: protectedProcedure
      .input(
        z.object({
          value: z.number().positive(),
          description: z.string().optional().default("Salário"),
          date: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addSalary(ctx.user.id, String(input.value), input.description, input.date);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSalary(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── DESPESAS ────────────────────────────────────────────────────────────────
  expenses: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await getExpensesByUser(ctx.user.id);
      return rows.map((r) => ({
        ...r,
        value: parseFloat(r.value as unknown as string),
        date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
      }));
    }),

    add: protectedProcedure
      .input(
        z.object({
          description: z.string().min(1),
          value: z.number().positive(),
          category: z.enum(expenseCategories),
          date: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addExpense(ctx.user.id, input.description, String(input.value), input.category, input.date);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteExpense(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── RECEITAS ────────────────────────────────────────────────────────────────
  incomes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await getIncomesByUser(ctx.user.id);
      return rows.map((r) => ({
        ...r,
        value: parseFloat(r.value as unknown as string),
        date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
      }));
    }),

    add: protectedProcedure
      .input(
        z.object({
          description: z.string().min(1),
          value: z.number().positive(),
          date: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addIncome(ctx.user.id, input.description, String(input.value), input.date);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteIncome(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── DÍVIDAS ─────────────────────────────────────────────────────────────────
  debts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await getDebtsByUser(ctx.user.id);
      return rows.map((r) => ({
        ...r,
        value: parseFloat(r.value as unknown as string),
        dueDate: r.dueDate instanceof Date ? r.dueDate.toISOString().split("T")[0] : String(r.dueDate),
      }));
    }),

    add: protectedProcedure
      .input(
        z.object({
          description: z.string().min(1),
          value: z.number().positive(),
          type: z.enum(debtTypes),
          dueDate: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addDebt(ctx.user.id, input.description, String(input.value), input.type, input.dueDate);
        return { success: true };
      }),

    togglePaid: protectedProcedure
      .input(z.object({ id: z.number(), paid: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await toggleDebtPaid(input.id, ctx.user.id, input.paid);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteDebt(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── CARTÃO ──────────────────────────────────────────────────────────────────
  cards: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await getCardsByUser(ctx.user.id);
      return rows.map((r) => ({
        ...r,
        value: parseFloat(r.value as unknown as string),
        creditLimit: parseFloat(r.creditLimit as unknown as string),
        date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
      }));
    }),

    add: protectedProcedure
      .input(
        z.object({
          description: z.string().min(1),
          value: z.number().positive(),
          flag: z.enum(cardFlags),
          installments: z.number().int().min(1).max(48),
          creditLimit: z.number().min(0),
          date: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addCard(
          ctx.user.id,
          input.description,
          String(input.value),
          input.flag,
          input.installments,
          String(input.creditLimit),
          input.date
        );
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCard(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
