import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
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
  disableExpiredPremium,
  getCardsByUser,
  getDb,
  getDebtsByUser,
  getExpensesByUser,
  getGoalsByUser,
  getIncomesByUser,
  getSalariesByUser,
  getUserByEmail,
  toggleDebtPaid,
  toggleGoalCompleted,
  updateExpenseReceipt,
  updateGoal,
  upsertUser,
} from "./db";
import { saveBase64Image } from "./localUpload";
import { budgets as budgetsT, customCategories as cCatT, debts as debtsT, expenses as expensesT, goals, incomes as incomesT, salaries as salariesT, users } from "../drizzle/schema";

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
    me: publicProcedure.query(async (opts) => {
      if (!opts.ctx.user) return null;
      if (opts.ctx.user.premium && opts.ctx.user.premiumUntil) {
        await disableExpiredPremium(opts.ctx.user.id);
        if (new Date(opts.ctx.user.premiumUntil) <= new Date()) {
          opts.ctx.user.premium = false;
          opts.ctx.user.premiumUntil = null;
        }
      }
      const { passwordHash: _, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email inválido"),
          password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
          name: z.string().min(1, "Nome é obrigatório"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Este email já está cadastrado" });
        }

        const openId = randomUUID();
        const passwordHash = await bcrypt.hash(input.password, 10);

        await db.insert(users).values({
          openId,
          name: input.name,
          email: input.email,
          passwordHash,
          loginMethod: "email",
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email inválido"),
          password: z.string().min(1, "Senha é obrigatória"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
        }

        if (user.premium && user.premiumUntil && new Date(user.premiumUntil) <= new Date()) {
          await disableExpiredPremium(user.id);
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name ?? "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        await upsertUser({ openId: user.openId, lastSignedIn: new Date() });

        return { success: true };
      }),
    activateTrial: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      if (ctx.user.trialUsed) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você já utilizou seu teste grátis." });
      }
      const premiumUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.update(users).set({ premium: true, premiumUntil, trialUsed: true }).where(eq(users.id, ctx.user.id));
      return { premium: true, premiumUntil: premiumUntil.toISOString() };
    }),
  }),

  // ── DADOS (PREMIUM) ─────────────────────────────────────────────────────────
  data: router({
    exportCsv: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.premium) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Exportar dados requer plano Premium" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const expenses = await db.select().from(expensesT).where(eq(expensesT.userId, ctx.user.id));
      const incomes = await db.select().from(incomesT).where(eq(incomesT.userId, ctx.user.id));
      const salaries = await db.select().from(salariesT).where(eq(salariesT.userId, ctx.user.id));

      let csv = "Tipo,Descrição,Valor,Data\n";

      salaries.forEach((s) => {
        csv += `Salário,${s.description},${s.value},${s.date}\n`;
      });
      expenses.forEach((e) => {
        csv += `Despesa,${e.description},${e.value},${e.date}\n`;
      });
      incomes.forEach((i) => {
        csv += `Receita,${i.description},${i.value},${i.date}\n`;
      });

      return { csv };
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
        const result = await addExpense(ctx.user.id, input.description, String(input.value), input.category, input.date);
        return { success: true, id: result.id };
      }),

    uploadReceipt: protectedProcedure
      .input(z.object({ expenseId: z.number(), base64: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.premium) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Anexar comprovantes requer plano Premium" });
        }
        const url = await saveBase64Image(input.base64);
        await updateExpenseReceipt(input.expenseId, ctx.user.id, url);
        return { url };
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
        if (!ctx.user.premium) {
          const db = await getDb();
          const existing = await db?.select().from(goals).where(eq(goals.userId, ctx.user.id));
          if (existing && existing.length >= 3) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Limite de 3 metas no plano Free. Ative o Premium para metas ilimitadas.",
            });
          }
        }
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

  // ── PREMIUM ──────────────────────────────────────────────────────────────────
  premium: router({
    projection: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.premium) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const expenses = await db.select().from(expensesT).where(eq(expensesT.userId, ctx.user.id));
      const incomes = await db.select().from(incomesT).where(eq(incomesT.userId, ctx.user.id));
      const salaries = await db.select().from(salariesT).where(eq(salariesT.userId, ctx.user.id));

      const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      const toMonth = (d: Date | string) => String(d).slice(0, 7);
      const avgExpense = expenses.length > 0 ? expenses.reduce((s, e) => s + Number(e.value), 0) / Math.max(1, new Set(expenses.map(e => toMonth(e.date))).size) : 0;
      const avgIncome = [...incomes, ...salaries].length > 0
        ? [...incomes, ...salaries].reduce((s, i) => s + Number(i.value), 0) / Math.max(1, new Set([...incomes, ...salaries].map(i => toMonth(i.date))).size)
        : 0;
      const balance = avgIncome - avgExpense;

      const now = new Date();
      const projection = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        return { month: `${months[d.getMonth()]}/${d.getFullYear()}`, projected: Math.round((avgIncome + balance * i) * 100) / 100 };
      });

      return { avgIncome: Math.round(avgIncome * 100) / 100, avgExpense: Math.round(avgExpense * 100) / 100, monthlyBalance: Math.round(balance * 100) / 100, projection };
    }),

    yearlyOverview: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.premium) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const expenses = await db.select().from(expensesT).where(eq(expensesT.userId, ctx.user.id));
      const incomes = await db.select().from(incomesT).where(eq(incomesT.userId, ctx.user.id));
      const salaries = await db.select().from(salariesT).where(eq(salariesT.userId, ctx.user.id));

      const monthly: Record<string, { income: number; expense: number }> = {};
      const addVal = (map: Record<string, { income: number; expense: number }>, key: string, income: number, expense: number) => {
        if (!map[key]) map[key] = { income: 0, expense: 0 };
        map[key].income += income;
        map[key].expense += expense;
      };

      const toMonth = (d: Date | string) => String(d).slice(0, 7);
      expenses.forEach(e => addVal(monthly, toMonth(e.date), 0, Number(e.value)));
      incomes.forEach(i => addVal(monthly, toMonth(i.date), Number(i.value), 0));
      salaries.forEach(s => addVal(monthly, toMonth(s.date), Number(s.value), 0));

      const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      return Object.entries(monthly).sort().map(([m, v]) => ({
        month: `${months[parseInt(m.slice(5)) - 1]}/${m.slice(2, 4)}`,
        income: Math.round(v.income * 100) / 100,
        expense: Math.round(v.expense * 100) / 100,
      }));
    }),

    debtAlerts: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.premium) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const debts = await db.select().from(debtsT).where(and(eq(debtsT.userId, ctx.user.id), eq(debtsT.paid, false)));
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return debts.filter(d => {
        const due = new Date(d.dueDate);
        return due >= now && due <= sevenDays;
      }).map(d => ({ id: d.id, description: d.description, value: Number(d.value), dueDate: d.dueDate }));
    }),

    // Categorias personalizadas
    listCategories: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.premium) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(cCatT).where(eq(cCatT.userId, ctx.user.id));
    }),

    addCategory: protectedProcedure.input(z.object({ name: z.string().min(1).max(100) })).mutation(async ({ ctx, input }) => {
      if (!ctx.user.premium) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(cCatT).values({ userId: ctx.user.id, name: input.name });
      return { success: true };
    }),

    deleteCategory: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user.premium) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(cCatT).where(and(eq(cCatT.id, input.id), eq(cCatT.userId, ctx.user.id)));
      return { success: true };
    }),

    // Orçamentos
    listBudgets: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.premium) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return db.select().from(budgetsT).where(and(eq(budgetsT.userId, ctx.user.id), eq(budgetsT.month, month)));
    }),

    upsertBudget: protectedProcedure.input(z.object({ category: z.string(), spendingLimit: z.number().positive() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user.premium) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const existing = await db.select().from(budgetsT).where(and(eq(budgetsT.userId, ctx.user.id), eq(budgetsT.month, month), eq(budgetsT.category, input.category)));
      if (existing.length > 0) {
        await db.update(budgetsT).set({ spendingLimit: String(input.spendingLimit) }).where(eq(budgetsT.id, existing[0].id));
      } else {
        await db.insert(budgetsT).values({ userId: ctx.user.id, category: input.category, month, spendingLimit: String(input.spendingLimit) });
      }
      return { success: true };
    }),

    deleteBudget: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user.premium) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(budgetsT).where(and(eq(budgetsT.id, input.id), eq(budgetsT.userId, ctx.user.id)));
      return { success: true };
    }),

    budgetProgress: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.premium) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const budgets = await db.select().from(budgetsT).where(and(eq(budgetsT.userId, ctx.user.id), eq(budgetsT.month, month)));
      const allExp = await db.select().from(expensesT).where(eq(expensesT.userId, ctx.user.id));
      const monthExp = allExp.filter(e => String(e.date).startsWith(month));
      return budgets.map(b => {
        const spent = monthExp.filter(e => (e.customCategory || e.category) === b.category).reduce((s, e) => s + Number(e.value), 0);
        const limitVal = Number(b.spendingLimit);
        return { id: b.id, category: b.category, limit: limitVal, spent: Math.round(spent * 100) / 100, percent: Math.round((spent / limitVal) * 100) };
      });
    }),
  }),
});

export type AppRouter = typeof appRouter;
