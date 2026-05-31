import type { Express, Request, Response } from "express";
import express from "express";
import { getUserByEmail, updateLocalUserPremium } from "./authStore";
import * as db from "./db";

type OpenPixWebhookPayload = {
  event: string;
  charge: {
    correlationID: string;
    value: number;
    status: string;
    brCode: string;
    customer: { name: string; email: string } | null;
  };
};

export function registerOpenPixWebhook(app: Express) {
  app.post(
    "/api/webhook/openpix",
    express.json(),
    async (req: Request, res: Response) => {
      try {
        const payload = req.body as OpenPixWebhookPayload;
        if (payload.event !== "OPENPIX:CHARGE_COMPLETED") {
          res.status(200).json({ received: true });
          return;
        }

        const customerEmail = payload.charge?.customer?.email;
        if (!customerEmail) {
          res.status(200).json({ received: true });
          return;
        }

        const months = 1;
        const now = new Date();
        const premiumUntil = new Date(now.setMonth(now.getMonth() + months));

        const user = await getUserByEmail(customerEmail);
        if (user) {
          await updateLocalUserPremium(customerEmail, true, premiumUntil.toISOString());
          try {
            await db.activatePremium(user.id, months);
          } catch {
            // DB not available
          }
        }

        res.status(200).json({ received: true });
      } catch {
        res.status(200).json({ received: true });
      }
    }
  );
}
