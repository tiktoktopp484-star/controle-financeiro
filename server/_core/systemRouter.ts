import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { sdk } from "./sdk";

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
    // Test session verification
    let verifyResult: any = "not_tested";
    try {
      const cookies = new Map(Object.entries(
        Object.fromEntries(
          cookie.split(";").filter(Boolean).map((c: string) => {
            const eqIdx = c.indexOf("=");
            return [c.substring(0, eqIdx).trim(), c.substring(eqIdx + 1).trim()];
          })
        )
      ));
      const sessionCookie = cookies.get("app_session_id") || null;
      if (sessionCookie) {
        verifyResult = await sdk.verifySession(sessionCookie);
      } else {
        verifyResult = "no_session_cookie";
      }
    } catch (e: any) {
      verifyResult = "error: " + e.message;
    }
    // Test full auth
    let authResult: any = "not_tested";
    try {
      const user = await sdk.authenticateRequest(ctx.req);
      const { passwordHash: _pw, ...safe } = user as any;
      authResult = safe;
    } catch (e: any) {
      authResult = "auth_error: " + e.message;
    }
    return {
      cookie,
      dbStatus,
      userLookup,
      envHasJwt: !!process.env.JWT_SECRET,
      verifyResult,
      authResult,
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
