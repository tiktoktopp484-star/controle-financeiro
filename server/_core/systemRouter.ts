import { z } from "zod";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";

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
    let secretComparison: any = null;
    let parsedCookieValue: any = null;
    try {
      const parsedRaw = parseCookieHeader(cookie);
      parsedCookieValue = parsedRaw[COOKIE_NAME] || null;

      if (parsedCookieValue) {
        const rawSecret = process.env.JWT_SECRET || "";
        const directKey = new TextEncoder().encode(rawSecret);
        const sdkKey = (sdk as any).getSessionSecret();
        secretComparison = {
          rawSecretLength: rawSecret.length,
          directKeyBytes: directKey.byteLength,
          sdkKeyBytes: sdkKey.byteLength,
          keysEqual: directKey.byteLength === sdkKey.byteLength && directKey.every((b: number, i: number) => b === sdkKey[i]),
          firstBytes: Array.from(directKey.slice(0, 10)),
          sdkFirstBytes: Array.from(sdkKey.slice(0, 10)),
        };
        const result = await jwtVerify(parsedCookieValue, directKey, { algorithms: ["HS256"] });
        jwtResult = {
          openId: result.payload.openId,
        };
        sdkResult = await sdk.verifySession(parsedCookieValue);
      } else {
        jwtResult = "no_cookie";
      }
    } catch (e: any) {
      jwtResult = "error: " + e.message;
      if (e.stack) jwtResult += " | " + e.stack.split("\n")[1];
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
      parsedCookieValue,
      secretComparison,
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
