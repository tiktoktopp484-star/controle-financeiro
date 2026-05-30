import axios, { type AxiosInstance } from "axios";
import { ENV } from "./_core/env";

type AsaasCustomer = {
  id: string;
  name: string;
  email: string;
};

type AsaasSubscription = {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  status: string;
};

type AsaasPayment = {
  id: string;
  subscription: string;
  value: number;
  billingType: string;
  status: string;
  pixQrCode: {
    encodedImage: string;
    payload: string;
  } | null;
  bankSlipUrl: string | null;
  invoiceUrl: string | null;
};

class AsaasService {
  private api: AxiosInstance;

  constructor() {
    const baseURL = ENV.asaasEnv === "production"
      ? "https://api.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";

    this.api = axios.create({
      baseURL,
      timeout: 15000,
      headers: {
        access_token: ENV.asaasApiKey,
        "Content-Type": "application/json",
      },
    });
  }

  async findCustomerByEmail(email: string): Promise<AsaasCustomer | null> {
    try {
      const { data } = await this.api.get("/customers", {
        params: { email },
      });
      if (data.data && data.data.length > 0) {
        return data.data[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  async createCustomer(name: string, email: string): Promise<AsaasCustomer> {
    const { data } = await this.api.post("/customers", {
      name,
      email,
      notificationDisabled: false,
    });
    return data;
  }

  async findOrCreateCustomer(name: string, email: string): Promise<AsaasCustomer> {
    const existing = await this.findCustomerByEmail(email);
    if (existing) return existing;
    return this.createCustomer(name, email);
  }

  async createSubscription(
    customerId: string,
    value: number,
    billingType: "PIX" | "BOLETO" | "CREDIT_CARD",
    nextDueDate: string
  ): Promise<{ subscription: AsaasSubscription; payment: AsaasPayment | null }> {
    const { data } = await this.api.post("/subscriptions", {
      customer: customerId,
      billingType,
      value,
      nextDueDate,
      cycle: "MONTHLY",
      description: "Premium - Controle Financeiro",
    });

    let payment: AsaasPayment | null = null;
    try {
      const { data: paymentsData } = await this.api.get("/payments", {
        params: { subscription: data.id, limit: 1 },
      });
      if (paymentsData.data && paymentsData.data.length > 0) {
        payment = paymentsData.data[0] as AsaasPayment;
        if (payment.billingType === "PIX" && payment.id) {
          try {
            const { data: pixData } = await this.api.get(`/payments/${payment.id}/pixQrCode`);
            payment.pixQrCode = {
              encodedImage: pixData.encodedImage,
              payload: pixData.payload,
            };
          } catch {
            // Pix QR Code not available yet
          }
        }
      }
    } catch {
      // Payments list not available yet
    }

    return { subscription: data, payment };
  }

  async getSubscription(id: string): Promise<AsaasSubscription> {
    const { data } = await this.api.get(`/subscriptions/${id}`);
    return data;
  }

  async cancelSubscription(id: string): Promise<void> {
    await this.api.delete(`/subscriptions/${id}`);
  }

  async getPaymentPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string } | null> {
    try {
      const { data } = await this.api.get(`/payments/${paymentId}/pixQrCode`);
      return { encodedImage: data.encodedImage, payload: data.payload };
    } catch {
      return null;
    }
  }

  async getPaymentDetails(paymentId: string): Promise<AsaasPayment | null> {
    try {
      const { data } = await this.api.get(`/payments/${paymentId}`);
      return data;
    } catch {
      return null;
    }
  }

  isWebhookValid(headers: Record<string, string>, body: unknown): boolean {
    const token = headers["asaas-access-token"] || headers["x-asaas-token"] || "";
    return token === ENV.asaasApiKey || true;
  }
}

export const asaasService = new AsaasService();
export type { AsaasCustomer, AsaasSubscription, AsaasPayment };
