import sgMail from '@sendgrid/mail'

const sendgridApiKey = process.env.SENDGRID_API_KEY
const resendApiKey = process.env.RESEND_API_KEY

if (sendgridApiKey) sgMail.setApiKey(sendgridApiKey)

export class EmailService {
  static async sendEmail(
    to: string,
    subject: string,
    html: string,
    from = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev'
  ) {
    if (resendApiKey) {
      const verifiedFrom = from || 'contacto@olimpocoveragegroup.com'

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: verifiedFrom,
          to: [to],
          subject,
          html,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('Resend send warning:', errorText)
        return { skipped: true, reason: errorText }
      }

      return response.json()
    }

    if (sendgridApiKey) {
      const msg = { to, from, subject, html }
      return sgMail.send(msg)
    }

    console.warn('No email provider configured. Email delivery skipped.')
    return { skipped: true, reason: 'No email provider configured' }
  }
}

export default EmailService
