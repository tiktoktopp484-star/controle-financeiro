import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { notifyOwner } from "./notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc";

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

  makeAdmin: protectedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.user!;
    const { updateLocalUserRole } = await import("../authStore");
    await updateLocalUserRole(user.email!, "admin");
    return { success: true };
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
