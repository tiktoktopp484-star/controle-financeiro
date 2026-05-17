import { initTRPC } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { z } from "zod";

const t = initTRPC.context().create();
const authed = t.middleware(({ next, ctx }) => next({ ctx: { ...ctx, user: ctx.user || { id: 1 } } }));
const protectedProcedure = t.procedure.use(authed);

const router = t.router({
  auth: t.router({
    publicQuery: t.procedure.query(() => "public query ok"),
    publicMutation: t.procedure.mutation(() => "public mutation ok"),
    publicWithInput: t.procedure.input(z.object({ name: z.string() })).mutation(() => "public with input ok"),
    protectedMutation: protectedProcedure.mutation(() => "protected mutation ok"),
    protectedWithInput: protectedProcedure.input(z.object({ name: z.string() })).mutation(() => "protected with input ok"),
  }),
  expenses: t.router({
    list: protectedProcedure.query(() => "list ok"),
    add: protectedProcedure.input(z.object({ name: z.string() })).mutation(() => "add ok"),
  }),
});

console.log("Procedures:", Object.keys(router._def.procedures));
console.log("Auth keys:", Object.keys((router as any).auth));
console.log("Auth has _def:", !!(router as any).auth?._def);

const app = express();
app.use(express.json());
app.use("/api/trpc", createExpressMiddleware({ router }));
app.listen(3458, () => {
  console.log("\nServer at http://localhost:3458");
  setTimeout(async () => {
    const tests: [string, string][] = [
      ["auth.publicQuery", "GET"],
      ["auth.publicMutation", "POST"],
      ["auth.publicWithInput", "POST"],
      ["auth.protectedMutation", "POST"],
      ["auth.protectedWithInput", "POST"],
      ["expenses.list", "GET"],
      ["expenses.add", "POST"],
    ];
    for (const [path, method] of tests) {
      const url = `http://localhost:3458/api/trpc/${path}`;
      const opts: any = { method };
      if (method === "POST") {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = "{}";
      }
      const res = await fetch(url, opts);
      const text = await res.text();
      const ok = !text.includes("NOT_FOUND") ? "✅" : "❌";
      console.log(`${ok} ${path} (${method}): ${text.slice(0, 100)}`);
    }
    process.exit(0);
  }, 500);
});
