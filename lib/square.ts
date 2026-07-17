/* eslint-disable @typescript-eslint/no-explicit-any */
import { SquareClient, SquareEnvironment } from 'square'

const squareToken = process.env.SQUARE_TOKEN || process.env.SQUARE_ACCESS_TOKEN
const envName = process.env.SQUARE_ENVIRONMENT || process.env.SQUARE_ENV || process.env.NODE_ENV || 'development'

if (!squareToken) {
  console.warn('SQUARE_TOKEN / SQUARE_ACCESS_TOKEN not set — server payments will fail if called.')
}

const environment = envName === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox

// Cast options to any because installed SDK types may differ in this workspace.
export const squareClient = new SquareClient({
  environment,
  token: squareToken || undefined,
} as any)

// Thin integration helpers: export the canonical methods that other modules should use.
// Keep shapes permissive (`any`) so the rest of the codebase can migrate safely.
export async function createPayment(req: unknown, opts?: unknown) {
  // Use the official payments resource dynamically
  const clientRec = squareClient as unknown as Record<string, unknown>
  const payments = clientRec['payments'] as Record<string, unknown> | undefined
  const createFn = payments && (payments['create'] as ((r: unknown, o?: unknown) => Promise<unknown>) | undefined)
  if (createFn && typeof createFn === 'function') return createFn(req, opts)
  throw new Error('Payments.create not available on Square client')
}

export async function createCheckout(locationId: string, body: any, opts?: any) {
  if (!squareClient.checkout || !squareClient.checkout.paymentLinks) {
    throw new Error('Square SDK does not support checkout.paymentLinks on this client instance')
  }

  const normalizedOrder = body?.order?.order ? body.order.order : body?.order
  const requestBody = {
    ...body,
    order: {
      ...normalizedOrder,
      locationId,
    },
    checkout_options: body.checkout_options,
  }

  return squareClient.checkout.paymentLinks.create(requestBody, opts)
}

export default squareClient
