import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key (bypasses RLS)
export function getServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey)
}

// Database types
export type Volunteer = {
  id: string
  email: string
  display_name: string | null
  is_online: boolean
  last_seen: string
  created_at: string
}

export type Conversation = {
  id: string
  phone_number: string
  contact_name: string | null
  detected_language: string
  status: 'new' | 'active' | 'resolved'
  assigned_volunteer_id: string | null
  last_reply_by: string | null
  last_reply_at: string | null
  created_at: string
  updated_at: string
}

export type Message = {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  original_text: string
  translated_text: string | null
  detected_language: string | null
  translation_error: string | null
  status: 'pending' | 'sent' | 'failed'
  retry_count: number
  volunteer_id: string | null
  volunteer_name: string | null
  twilio_sid: string | null
  error_message: string | null
  created_at: string
}
