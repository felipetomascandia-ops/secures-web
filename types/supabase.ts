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
    }
  }
}
