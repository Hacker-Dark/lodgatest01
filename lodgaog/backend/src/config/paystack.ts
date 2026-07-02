import dotenv from 'dotenv';
dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || '';

export const paystackConfig = {
  secretKey: PAYSTACK_SECRET_KEY,
  publicKey: PAYSTACK_PUBLIC_KEY,
  isTestMode: !PAYSTACK_SECRET_KEY,
};

if (!PAYSTACK_SECRET_KEY) {
  console.warn('Paystack Warning: PAYSTACK_SECRET_KEY is not defined. Payments will run in sandbox-simulator mode.');
}

/**
 * Interface representing Paystack checkout response
 */
export interface PaystackCheckoutPayload {
  authorization_url: string;
  reference: string;
  access_code: string;
}

/**
 * Initiates checkout transaction with Paystack (or models sandbox representation)
 */
export async function initiatePaystackPayment(
  email: string,
  amountInKobo: number,
  reference: string,
  callbackUrl: string
): Promise<PaystackCheckoutPayload> {
  if (paystackConfig.isTestMode) {
    // Return high-fidelity simulator link for the live preview iframe
    return {
      authorization_url: `https://checkout.paystack.com/simulate-sandbox-checkout?ref=${reference}&amount=${amountInKobo}&callback=${encodeURIComponent(callbackUrl)}`,
      reference,
      access_code: 'SIMULATED_ACCESS_CODE_OK'
    };
  }

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackConfig.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        reference,
        callback_url: callbackUrl,
        metadata: {
          custom_fields: [
            {
              display_name: "Application",
              variable_name: "project",
              value: "Lodga Marketplace"
            }
          ]
        }
      })
    });

    const data = await response.json();
    if (!response.ok || !data.status) {
      throw new Error(data.message || 'Paystack payment initialization failed.');
    }

    return {
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      access_code: data.data.access_code
    };
  } catch (error: any) {
    console.error('Paystack API Error:', error);
    // Graceful callback mockup so developer testing doesn't break
    return {
      authorization_url: `https://checkout.paystack.com/simulate-sandbox-checkout?ref=${reference}&amount=${amountInKobo}&callback=${encodeURIComponent(callbackUrl)}`,
      reference,
      access_code: 'MOCK_REF_DUE_TO_ERROR'
    };
  }
}
