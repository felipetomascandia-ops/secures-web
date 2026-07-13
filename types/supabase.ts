export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tickets: {
        Row: {
          id: string
          created_at: string
          title: string
          description: string
          status: 'open' | 'in_progress' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          user_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          description: string
          status?: 'open' | 'in_progress' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          user_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          description?: string
          status?: 'open' | 'in_progress' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          user_id?: string
          updated_at?: string
        }
      }
      ticket_messages: {
        Row: {
          id: string
          created_at: string
          ticket_id: string
          user_id: string
          message: string
          is_admin: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          ticket_id: string
          user_id: string
          message: string
          is_admin?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          ticket_id?: string
          user_id?: string
          message?: string
          is_admin?: boolean
        }
      }
      admins: {
        Row: {
          id: string
          user_id: string
          role: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string | null
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string | null
          last_name: string | null
          full_name: string | null
          email: string | null
          business_name: string | null
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          email?: string | null
          business_name?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          email?: string | null
          business_name?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          square_checkout_id: string | null
          square_url: string | null
          amount: number
          currency: string
          status: string
          customer: string
          email: string
          phone: string | null
          description: string | null
          contract_id: string | null
          created_by: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          square_checkout_id?: string | null
          square_url?: string | null
          amount: number
          currency: string
          status?: string
          customer: string
          email: string
          phone?: string | null
          description?: string | null
          contract_id?: string | null
          created_by?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          square_checkout_id?: string | null
          square_url?: string | null
          amount?: number
          currency?: string
          status?: string
          customer?: string
          email?: string
          phone?: string | null
          description?: string | null
          contract_id?: string | null
          created_by?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          contract_number: string | null
          contract_date: string | null
          client_name: string | null
          client_company_name: string | null
          client_address: string | null
          client_city: string | null
          client_state: string | null
          client_zip: string | null
          client_email: string | null
          client_phone: string | null
          total_premium: number | null
          down_payment: number | null
          monthly_payment: number | null
          number_of_payments: number | null
          first_due_date: string | null
          terms: string | null
          created_by: string | null
          user_id: string | null
          insurance_type: string | null
          status: string | null
          policy_status: string | null
          expiration_date: string | null
          signed_document_url: string | null
          certificate_url: string | null
          approved_at: string | null
          client_signature: string | null
          client_signature_date: string | null
          is_signed: boolean | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          contract_number?: string | null
          contract_date?: string | null
          client_name?: string | null
          client_company_name?: string | null
          client_address?: string | null
          client_city?: string | null
          client_state?: string | null
          client_zip?: string | null
          client_email?: string | null
          client_phone?: string | null
          total_premium?: number | null
          down_payment?: number | null
          monthly_payment?: number | null
          number_of_payments?: number | null
          first_due_date?: string | null
          terms?: string | null
          created_by?: string | null
          user_id?: string | null
          insurance_type?: string | null
          status?: string | null
          policy_status?: string | null
          expiration_date?: string | null
          signed_document_url?: string | null
          certificate_url?: string | null
          approved_at?: string | null
          client_signature?: string | null
          client_signature_date?: string | null
          is_signed?: boolean | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          contract_number?: string | null
          contract_date?: string | null
          client_name?: string | null
          client_company_name?: string | null
          client_address?: string | null
          client_city?: string | null
          client_state?: string | null
          client_zip?: string | null
          client_email?: string | null
          client_phone?: string | null
          total_premium?: number | null
          down_payment?: number | null
          monthly_payment?: number | null
          number_of_payments?: number | null
          first_due_date?: string | null
          terms?: string | null
          created_by?: string | null
          user_id?: string | null
          insurance_type?: string | null
          status?: string | null
          policy_status?: string | null
          expiration_date?: string | null
          signed_document_url?: string | null
          certificate_url?: string | null
          approved_at?: string | null
          client_signature?: string | null
          client_signature_date?: string | null
          is_signed?: boolean | null
        }
      }
      payment_schedules: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          contract_id: string | null
          sequence: number | null
          label: string | null
          amount: number | null
          due_date: string | null
          status: string | null
          checkout_id: string | null
          checkout_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          contract_id?: string | null
          sequence?: number | null
          label?: string | null
          amount?: number | null
          due_date?: string | null
          status?: string | null
          checkout_id?: string | null
          checkout_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          contract_id?: string | null
          sequence?: number | null
          label?: string | null
          amount?: number | null
          due_date?: string | null
          status?: string | null
          checkout_id?: string | null
          checkout_url?: string | null
        }
      }
      square_payments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          schedule_id: string | null
          square_checkout_id: string | null
          square_payment_id: string | null
          receipt_url: string | null
          amount: number | null
          currency: string | null
          status: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          schedule_id?: string | null
          square_checkout_id?: string | null
          square_payment_id?: string | null
          receipt_url?: string | null
          amount?: number | null
          currency?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          schedule_id?: string | null
          square_checkout_id?: string | null
          square_payment_id?: string | null
          receipt_url?: string | null
          amount?: number | null
          currency?: string | null
          status?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
