import { initTRPC } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

const t = initTRPC.context().create();
const authed = t.middleware(({ next, ctx }) => next({ ctx: { ...ctx, user: ctx.user || { id: 1 } } }));
const protectedProcedure = t.procedure.use(authed);

const router = t.router({
  auth: t.router({
    publicQuery: t.procedure.query(() => "public query ok"),
    publicMutation: t.procedure.mutation(() => "public mutation ok"),
    publicWithInput: t.procedure.input({ parse: (x: any) => x }).mutation(() => "public with input ok"),
    protectedMutation: protectedProcedure.mutation(() => "protected mutation ok"),
    protectedWithInput: protectedProcedure.input({ parse: (x: any) => x }).mutation(() => "protected with input ok"),
  }),
  expenses: t.router({
    list: protectedProcedure.query(() => "list ok"),
    add: protectedProcedure.input({ parse: (x: any) => x }).mutation(() => "add ok"),
  }),
});

console.log("Procedures:", Object.keys(router._def.procedures));
console.log("Record keys:", Object.keys(router._def.record));
console.log("Auth isRouter:", !!(router as any).auth?._def?.router);

import express from "express";
const app = express();
app.use(express.json());
app.use("/api/trpc", createExpressMiddleware({ router }));
app.listen(3458, () => {
  console.log("\nServer at http://localhost:3458");
  setTimeout(async () => {
    const tests = [
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
      const ok = text.includes("ok") ? "✅" : "❌";
      console.log(`${ok} ${path} (${method}): ${text.slice(0, 80)}`);
    }
    process.exit(0);
  }, 500);
});
