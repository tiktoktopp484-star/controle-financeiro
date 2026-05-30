import type { Express, Request, Response } from "express";
import express from "express";
import axios from "axios";
import { ENV } from "./_core/env";
import { getUserByEmail, updateLocalUserPremium } from "./authStore";
import * as db from "./db";

type AsaasWebhookEvent = {
  event: string;
  payment: {
    id: string;
    customer: string;
    subscription: string;
    value: number;
    status: string;
    billingType: string;
    confirmedDate: string;
  };
  subscription?: {
    id: string;
    status: string;
  };
};

async function handlePaymentConfirmed(event: AsaasWebhookEvent) {
  const { payment, subscription: subData } = event;
  const subscriptionId = payment.subscription || subData?.id;
  if (!subscriptionId) return;

  let customerEmail = "";

  try {
      const baseUrl = process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/api/v3" : "https://sandbox.asaas.com/api/v3";
      const { data: customerData } = await axios.get(`${baseUrl}/customers/${payment.customer}`, {
        headers: { access_token: process.env.ASAAS_API_KEY },
      });
      customerEmail = customerData.email;
    } catch {
      return;
    }

  if (!customerEmail) return;

  const now = new Date();
  const premiumUntil = new Date(now.setMonth(now.getMonth() + 1));

  const db_user = await getUserByEmail(customerEmail);
  if (db_user) {
    await db.activatePremium(db_user.id, 1, subscriptionId);
  } else {
    await updateLocalUserPremium(customerEmail, true, premiumUntil.toISOString());
  }
}

export function registerAsaasWebhook(app: Express) {
  app.post(
    "/api/webhook/asaas",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const token = req.headers["asaas-access-token"];
      if (ENV.asaasWebhookToken && token !== ENV.asaasWebhookToken) {
        console.warn("[Asaas Webhook] Invalid token");
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      try {
        const body = JSON.parse(req.body.toString()) as AsaasWebhookEvent;

        switch (body.event) {
          case "PAYMENT_CONFIRMED":
          case "PAYMENT_RECEIVED":
            await handlePaymentConfirmed(body);
            break;
          case "PAYMENT_OVERDUE":
          case "SUBSCRIPTION_CANCELED":
            break;
        }

        res.status(200).json({ received: true });
      } catch (error) {
        console.error("[Asaas Webhook] Error:", error);
        res.status(200).json({ received: true });
      }
    }
  );
}
