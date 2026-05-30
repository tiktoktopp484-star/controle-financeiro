import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

type AuthUser = NonNullable<TrpcContext["user"]>;

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requirePremium = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const user = ctx.user;
  if (!user.premium) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Recurso exclusivo para assinantes premium",
    });
  }
  if (user.premiumUntil && new Date(user.premiumUntil) <= new Date()) {
    const { disableExpiredPremium } = await import("../db");
    await disableExpiredPremium(user.id);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sua assinatura premium expirou",
    });
  }
  return next({ ctx: { ...ctx, user } });
});

export const premiumProcedure = t.procedure.use(requirePremium);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
