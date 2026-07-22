/* eslint-disable @typescript-eslint/no-explicit-any */
import supabaseAdmin from '@/lib/supabaseAdmin'
import SquareService from './SquareService'

const db: any = supabaseAdmin as any

export class PaymentsService {
  static async createScheduleItem(contractId: string, sequence: number, label: string, amount: number, dueDate?: string) {
    const { data, error } = await (db as unknown as any).from('payment_schedules').insert({
      contract_id: contractId,
      sequence,
      label,
      amount,
      due_date: dueDate || null,
      status: 'pending',
    } as any).select().single()
    if (error) throw error
    return data
  }

  static async createScheduleCheckout(scheduleId: string, amount: number, currency: string, description: string, customerEmail?: string, phone?: string, redirectUrl?: string) {
    const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
    if (!locationId) {
      return { checkout: null, skipped: true }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://olimpocoveragegroup.com'
    // Redirect ALL customers to the personal insurance success page,
    // NOT the admin payments page
    const finalRedirectUrl = redirectUrl || `${baseUrl}/personal-insurance/payment-success?scheduleId=${scheduleId}`

    const checkout = await SquareService.createCheckoutLink(
      locationId,
      Math.round(amount * 100),
      currency,
      description,
      finalRedirectUrl
    )

    const checkoutUrl = (checkout as any)?.url || (checkout as any)?.checkoutUrl || null
    const checkoutId = (checkout as any)?.id || null

    await (db as unknown as any).from('payment_schedules').update({
      checkout_id: checkoutId,
      checkout_url: checkoutUrl,
    }).eq('id', scheduleId)

    await (db as unknown as any).from('square_payments').insert({
      schedule_id: scheduleId,
      square_checkout_id: checkoutId,
      square_payment_id: null,
      receipt_url: null,
      amount,
      currency,
      status: 'checkout_created',
    } as any)

    return { checkout, checkoutUrl, checkoutId }
  }

  static async createDownPaymentCheckout(scheduleId: string, amount: number, currency: string, description: string, customerEmail?: string, phone?: string, redirectUrl?: string) {
    return this.createScheduleCheckout(scheduleId, amount, currency, description, customerEmail, phone, redirectUrl)
  }
}

export default PaymentsService
