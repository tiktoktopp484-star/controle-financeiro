import { z } from "zod";
import { jwtVerify } from "jose";
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
    let jwtResult: any = "not_tested";
    let sdkResult: any = "not_tested";
    try {
      const sessionCookie = (() => {
        const parts = cookie.split(";");
        for (const p of parts) {
          const idx = p.indexOf("=");
          if (idx > 0 && p.substring(0, idx).trim() === "app_session_id") {
            return p.substring(idx + 1).trim();
          }
        }
        return null;
      })();
      if (sessionCookie) {
        const rawSecret = process.env.JWT_SECRET || "";
        const secretKey = new TextEncoder().encode(rawSecret);
        const result = await jwtVerify(sessionCookie, secretKey, { algorithms: ["HS256"] });
        jwtResult = { openId: result.payload.openId };
        sdkResult = await sdk.verifySession(sessionCookie);
      } else {
        jwtResult = "no_session_cookie";
        sdkResult = "no_session_cookie";
      }
    } catch (e: any) {
      jwtResult = "jwt_error: " + e.message;
    }
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
      jwtResult,
      sdkVerifyResult: sdkResult,
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
