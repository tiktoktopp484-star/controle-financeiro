import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, premiumProcedure, adminProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { authenticateUser, registerUser, getUserByEmail, deleteUserByEmail, updateLocalUserPremium, updateUserPaymentReceipt, markTrialUsed, resetPassword, changePassword } from "./authStore";
import { sendResetLink } from "./email";
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
  updateExpenseReceipt,
  activatePremium as activatePremiumDb,
  deactivatePremium as deactivatePremiumDb,
  getCustomCategories,
  addCustomCategory,
  deleteCustomCategory,
  getBudgets,
  upsertBudget,
  deleteBudget,
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
    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      try {
        const { updateLocalUserRole } = await import("./authStore");
        if (user.email === "teste@teste.com") {
          if (user.role !== "admin") {
            await updateLocalUserRole(user.email, "admin");
            user.role = "admin";
          }
        } else if (user.role === "admin") {
          if (user.email) await updateLocalUserRole(user.email, "user");
          user.role = "user";
        }
      } catch {}
      return { ...user, isAdmin: user.role === "admin" };
    }),

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

    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email("Email inválido") }))
      .mutation(async ({ input }) => {
        const newPassword = await resetPassword(input.email);
        const sent = await sendResetLink(input.email, newPassword);
        if (!sent) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Não foi possível enviar o email. Tente novamente mais tarde.",
          });
        }
        return { message: "Nova senha enviada para seu email" };
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

    adminResetPassword: adminProcedure
      .input(z.object({ email: z.string().email("Email inválido") }))
      .mutation(async ({ input }) => {
        const newPassword = await resetPassword(input.email);
        const sent = await sendResetLink(input.email, newPassword);
        if (!sent) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Não foi possível enviar o email. Tente novamente.",
          });
        }
        return { message: "Senha redefinida com sucesso. Nova senha enviada para o email." };
      }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(4, "Nova senha deve ter no mínimo 4 caracteres"),
      }))
      .mutation(async ({ ctx, input }) => {
        const email = ctx.user.email;
        if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "Email não encontrado" });
        const ok = await changePassword(email, input.currentPassword, input.newPassword);
        if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });
        return { message: "Senha alterada com sucesso" };
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("Email inválido").optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const email = ctx.user.email;
        if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "Email não encontrado" });
        const { updateUserProfile } = await import("./authStore");
        const ok = await updateUserProfile(email, input.name, input.email);
        if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        return { success: true };
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
          category: z.string(),
          date: z.string(),
          recurring: z.boolean().optional(),
          recurringInterval: z.enum(["weekly", "monthly", "yearly"]).optional(),
          nextRecurringDate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await addExpense(
          ctx.user.id,
          input.description,
          String(input.value),
          input.category,
          input.date,
          input.recurring,
          input.recurringInterval,
          input.nextRecurringDate
        );
        return { success: true, id: result.id };
      }),

    uploadReceipt: protectedProcedure
      .input(z.object({
        expenseId: z.number(),
        imageBase64: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { saveBase64Image } = await import("./localUpload");
        const url = await saveBase64Image(input.imageBase64);
        await updateExpenseReceipt(input.expenseId, ctx.user.id, url);
        return { success: true, url };
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
          recurring: z.boolean().optional(),
          recurringInterval: z.enum(["weekly", "monthly", "yearly"]).optional(),
          nextRecurringDate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addIncome(
          ctx.user.id,
          input.description,
          String(input.value),
          input.date,
          input.recurring,
          input.recurringInterval,
          input.nextRecurringDate
        );
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

  // ── PREMIUM ──────────────────────────────────────────────────────────────────
  premium: router({
    checkout: protectedProcedure
      .mutation(async ({ ctx }) => {
        const user = ctx.user!;
        if (user.premium) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Você já é assinante premium",
          });
        }
        if (!user.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email não encontrado",
          });
        }

        if (ENV.openpixAppId) {
          const { randomUUID } = await import("crypto");
          const { createPixCharge } = await import("./openpix");
          const charge = await createPixCharge(
            randomUUID(),
            1990,
            user.name ?? user.email,
            user.email
          );
          return {
            brCode: charge.brCode,
            qrCodeImage: charge.qrCodeImage,
            paymentLinkUrl: charge.paymentLinkUrl,
            value: 19.90,
          };
        }

        const pixKey = ENV.pixKey;
        if (!pixKey) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Chave PIX não configurada. Entre em contato com o administrador.",
          });
        }
        return { pixKey, value: 19.90 };
      }),

    verify: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user!;
      return {
        premium: user.premium,
        premiumUntil: user.premiumUntil,
        email: user.email,
      };
    }),

    cancel: protectedProcedure.mutation(async ({ ctx }) => {
      const user = ctx.user!;
      const userByEmail = user.email ? await getUserByEmail(user.email) : null;
      if (!userByEmail) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      }
      if (user.email) {
        await updateLocalUserPremium(user.email, false, null);
      }
      return { success: true };
    }),

    activateTrial: protectedProcedure.mutation(async ({ ctx }) => {
      const user = ctx.user!;
      const userByEmail = user.email ? await getUserByEmail(user.email) : null;
      if (!userByEmail) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      }
      if (userByEmail.trialUsed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Teste grátis já foi utilizado" });
      }
      const now = new Date();
      const trialUntil = new Date(now.setDate(now.getDate() + 1));
      if (user.email) {
        await updateLocalUserPremium(user.email, true, trialUntil.toISOString());
        await markTrialUsed(user.email);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email não encontrado" });
      }
      return { success: true, premiumUntil: trialUntil.toISOString() };
    }),

    manualActivate: protectedProcedure.mutation(async ({ ctx }) => {
      const user = ctx.user!;
      if (!user.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email não encontrado" });
      }
      const now = new Date();
      const premiumUntil = new Date(now.setMonth(now.getMonth() + 1));
      await updateLocalUserPremium(user.email, true, premiumUntil.toISOString());
      return {
        success: true,
        premium: true,
        premiumUntil: premiumUntil.toISOString(),
      };
    }),

    uploadPaymentReceipt: protectedProcedure
      .input(z.object({ imageBase64: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const user = ctx.user!;
        if (!user.email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Email não encontrado" });
        }
        const { saveBase64Image } = await import("./localUpload");
        const url = await saveBase64Image(input.imageBase64);
        await updateUserPaymentReceipt(user.email, url);
        return { success: true, url };
      }),

    requestActivation: protectedProcedure.mutation(async ({ ctx }) => {
      const user = ctx.user!;
      if (!user.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email não encontrado" });
      }
      const stored = await getUserByEmail(user.email);
      const receiptUrl = stored?.paymentReceiptUrl;
      let msg = `🔔 Novo pedido Premium!\n\nEmail: ${user.email}\nNome: ${user.name || "—"}`;
      if (receiptUrl) {
        msg += `\n📎 Comprovante: ${ENV.appUrl}${receiptUrl}`;
      }
      msg += `\n\nAtive pelo painel Admin no app.`;
      const { sendWhatsApp } = await import("./_core/notification");
      const sent = await sendWhatsApp(msg);
      return { success: true, notified: sent, receiptUrl };
    }),
  }),

  admin: router({
    listUsers: adminProcedure.query(async () => {
      const { getAllUsers } = await import("./db");
      return await getAllUsers();
    }),

    activateUserPremium: adminProcedure
      .input(z.object({ email: z.string().email(), months: z.number().min(1).default(1) }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        }
        const now = new Date();
        const premiumUntil = new Date(now.setMonth(now.getMonth() + input.months));
        await updateLocalUserPremium(input.email, true, premiumUntil.toISOString());
        return {
          success: true,
          email: input.email,
          premium: true,
          premiumUntil: premiumUntil.toISOString(),
        };
      }),
  }),

  // ── CATEGORIAS PERSONALIZADAS (Premium) ─────────────────────────────────────
  customCategories: router({
    list: premiumProcedure.query(async ({ ctx }) => {
      const user = ctx.user!;
      try {
        return await getCustomCategories(user.id);
      } catch {
        return [];
      }
    }),

    add: premiumProcedure
      .input(z.object({ name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const user = ctx.user!;
        try {
          await addCustomCategory(user.id, input.name);
          return { success: true };
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar categoria" });
        }
      }),

    delete: premiumProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const user = ctx.user!;
        try {
          await deleteCustomCategory(input.id, user.id);
          return { success: true };
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir categoria" });
        }
      }),
  }),

  // ── ORÇAMENTOS (Premium) ────────────────────────────────────────────────────
  budgets: router({
    list: premiumProcedure.query(async ({ ctx }) => {
      const user = ctx.user!;
      try {
        return await getBudgets(user.id);
      } catch {
        return [];
      }
    }),

    upsert: premiumProcedure
      .input(
        z.object({
          category: z.string().min(1),
          month: z.string().length(7),
          spendingLimit: z.number().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = ctx.user!;
        try {
          await upsertBudget(user.id, input.category, input.month, String(input.spendingLimit));
          return { success: true };
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao salvar orçamento" });
        }
      }),

    delete: premiumProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const user = ctx.user!;
        try {
          await deleteBudget(input.id, user.id);
          return { success: true };
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir orçamento" });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
