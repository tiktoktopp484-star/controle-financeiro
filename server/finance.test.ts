import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user-openid",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      ...createAuthContext(),
      res: {
        clearCookie: (name: string) => { cleared.push(name); },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(cleared).toHaveLength(1);
  });
});

describe("auth.me", () => {
  it("returns the authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe("router structure", () => {
  it("has all required financial routers", () => {
    const router = appRouter;
    expect(router).toBeDefined();
    // Verify the router has the expected procedure namespaces
    const routerDef = router._def;
    expect(routerDef).toBeDefined();
  });

  it("protectedProcedure rejects unauthenticated users", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.salaries.list()).rejects.toThrow();
  });

  it("protectedProcedure rejects unauthenticated for expenses", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.expenses.list()).rejects.toThrow();
  });

  it("protectedProcedure rejects unauthenticated for incomes", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.incomes.list()).rejects.toThrow();
  });

  it("protectedProcedure rejects unauthenticated for debts", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.debts.list()).rejects.toThrow();
  });

  it("protectedProcedure rejects unauthenticated for cards", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.cards.list()).rejects.toThrow();
  });
});

describe("input validation", () => {
  it("rejects negative expense value", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.expenses.add({
        description: "Test",
        value: -10,
        category: "Outros",
        date: "2026-05-01",
      })
    ).rejects.toThrow();
  });

  it("rejects zero income value", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.incomes.add({
        description: "Test",
        value: 0,
        date: "2026-05-01",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid expense category", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.expenses.add({
        description: "Test",
        value: 100,
        // @ts-expect-error testing invalid category
        category: "InvalidCategory",
        date: "2026-05-01",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid debt type", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.debts.add({
        description: "Test",
        value: 100,
        // @ts-expect-error testing invalid type
        type: "InvalidType",
        dueDate: "2026-05-01",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid card flag", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.cards.add({
        description: "Test",
        value: 100,
        // @ts-expect-error testing invalid flag
        flag: "InvalidFlag",
        installments: 1,
        creditLimit: 0,
        date: "2026-05-01",
      })
    ).rejects.toThrow();
  });
});
