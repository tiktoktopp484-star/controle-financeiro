import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { authenticateUser, registerUser, getUserByEmail, deleteUserByEmail } from "./authStore";
import {
  addCard,
  addDebt,
  addExpense,
  addGoal,
  addIncome,
  addSalary,
  deleteCard,
  deleteDebt,
  deleteExpense,
  deleteGoal,
  deleteIncome,
  deleteSalary,
  depositGoal,
  getCardsByUser,
  getDebtsByUser,
  getExpensesByUser,
  getGoalsByUser,
  getIncomesByUser,
  getSalariesByUser,
  toggleDebtPaid,
  toggleGoalCompleted,
  updateGoal,
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

const goalCategories = ["Viagem", "Casa", "Carro", "Educacao", "Saude", "Lazer", "Outros"] as const;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Nome é obrigatório"),
          email: z.string().email("Email inválido"),
          password: z.string().min(4, "Senha deve ter no mínimo 4 caracteres"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email já cadastrado",
          });
        }

        const user = await registerUser(input.name, input.email, input.password);
        const sessionToken = await sdk.createSessionToken(user.email, {
          name: user.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email inválido"),
          password: z.string().min(1, "Senha é obrigatória"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await authenticateUser(input.email, input.password);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou senha inválidos",
          });
        }

        const sessionToken = await sdk.createSessionToken(user.email, {
          name: user.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      const email = ctx.user.email;
      if (!email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email não encontrado para esta conta",
        });
      }

      const deleted = await deleteUserByEmail(email);
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

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

  // ── METAS ─────────────────────────────────────────────────────────────────────
  goals: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await getGoalsByUser(ctx.user.id);
      return rows.map((r) => ({
        ...r,
        targetAmount: parseFloat(r.targetAmount as unknown as string),
        currentAmount: parseFloat(r.currentAmount as unknown as string),
        dueDate: r.dueDate instanceof Date ? r.dueDate.toISOString().split("T")[0] : (r.dueDate ? String(r.dueDate) : null),
      }));
    }),

    add: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional().default(""),
          targetAmount: z.number().positive(),
          category: z.enum(goalCategories),
          dueDate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addGoal(
          ctx.user.id,
          input.name,
          input.description,
          String(input.targetAmount),
          input.category,
          input.dueDate || null
        );
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1),
          description: z.string().optional().default(""),
          targetAmount: z.number().positive(),
          category: z.enum(goalCategories),
          dueDate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateGoal(
          input.id,
          ctx.user.id,
          input.name,
          input.description,
          String(input.targetAmount),
          input.category,
          input.dueDate || null
        );
        return { success: true };
      }),

    deposit: protectedProcedure
      .input(z.object({ id: z.number(), amount: z.number().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await depositGoal(input.id, ctx.user.id, String(input.amount));
        return result;
      }),

    toggleCompleted: protectedProcedure
      .input(z.object({ id: z.number(), completed: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await toggleGoalCompleted(input.id, ctx.user.id, input.completed);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteGoal(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
