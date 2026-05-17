import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  debug: publicProcedure.query(async ({ ctx }) => {
    const cookie = ctx.req.headers.cookie || "(none)";
    const db = await getDb();
    const dbStatus = db ? "ok" : "null";
    let userLookup: any = "not_tested";
    if (db) {
      try {
        const rows = await db.select().from(users).limit(5);
        userLookup = rows.map((u: any) => ({
          id: u.id,
          openIdPreview: (u.openId || "").substring(0, 12) + "...",
          name: u.name,
        }));
      } catch (e: any) {
        userLookup = "error: " + e.message;
      }
    }
    return {
      cookie,
      dbStatus,
      userLookup,
      envHasJwt: !!process.env.JWT_SECRET,
    };
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
