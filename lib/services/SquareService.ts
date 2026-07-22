/* eslint-disable @typescript-eslint/no-explicit-any */
import { createPayment, createCheckout } from '@/lib/square'

export class SquareService {
  static async createCheckoutLink(locationId: string, amountCents: number, currency: string, description: string, redirectUrl?: string, idempotencyKey?: string) {
    const checkoutBody: any = {
      idempotencyKey: idempotencyKey || `${Date.now()}-${Math.random()}`,
      idempotency_key: idempotencyKey || `${Date.now()}-${Math.random()}`,
      order: {
        locationId,
        location_id: locationId,
        lineItems: [
          {
            name: description || 'Payment',
            quantity: '1',
            basePriceMoney: { amount: BigInt(amountCents), currency },
            base_price_money: { amount: BigInt(amountCents), currency },
          },
        ],
        line_items: [
          {
            name: description || 'Payment',
            quantity: '1',
            base_price_money: { amount: BigInt(amountCents), currency },
            basePriceMoney: { amount: BigInt(amountCents), currency },
          },
        ],
      },
    }
    if (redirectUrl) {
      checkoutBody.checkoutOptions = { redirectUrl }
      checkoutBody.checkout_options = { redirect_url: redirectUrl }
    }

    console.log('SquareService.createCheckoutLink request body:', checkoutBody);

    const resp = await createCheckout(locationId, checkoutBody as unknown)
    console.log('SquareService.createCheckoutLink response:', resp);
    const respRec = resp as Record<string, unknown>
    const result = (respRec['result'] as Record<string, unknown> | undefined) ?? respRec
    return (result['paymentLink'] as unknown) ?? (result['checkout'] as unknown) ?? (result['payment_link'] as unknown) ?? null
  }

  static async createPayment(sourceId: string, amountCents: number, currency: string, idempotencyKey?: string) {
    const req = {
      idempotencyKey: idempotencyKey || `${Date.now()}-${Math.random()}`,
      sourceId,
      amountMoney: { amount: amountCents, currency },
    } as unknown
    const resp = await createPayment(req)
    const respRec = resp as Record<string, unknown>
    const result = (respRec['result'] as Record<string, unknown> | undefined) ?? respRec
    return result
  }
}

export default SquareService
