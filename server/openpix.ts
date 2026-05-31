import axios from "axios";
import { ENV } from "./_core/env";

const API_URL = "https://api.openpix.com.br/api/v1";

type OpenPixChargeResponse = {
  charge: {
    correlationID: string;
    value: number;
    status: string;
    brCode: string;
    qrCodeImage: string;
    paymentLinkUrl: string;
    customer: { name: string; email: string } | null;
  };
};

export async function createPixCharge(
  correlationID: string,
  valueCents: number,
  customerName: string,
  customerEmail: string
): Promise<OpenPixChargeResponse["charge"]> {
  const { data } = await axios.post<OpenPixChargeResponse>(
    `${API_URL}/charge`,
    {
      correlationID,
      value: valueCents,
      comment: "Premium - Controle Financeiro",
      customer: {
        name: customerName,
        email: customerEmail,
      },
    },
    {
      headers: {
        Authorization: ENV.openpixAppId,
        "Content-Type": "application/json",
      },
    }
  );

  return data.charge;
}
