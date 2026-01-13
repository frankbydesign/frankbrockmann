import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { getServiceRoleClient } from '@/lib/supabase'
import { translateToEnglish } from '@/lib/translate'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

/**
 * Twilio webhook endpoint - receives incoming SMS messages
 * Includes signature verification for security
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()
    const params = new URLSearchParams(body)

    // Verify Twilio signature
    const twilioSignature = request.headers.get('x-twilio-signature') || ''
    const url = request.url

    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      twilioSignature,
      url,
      Object.fromEntries(params)
    )

    if (!isValid) {
      console.error('Invalid Twilio signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      )
    }

    // Extract message data
    const from = params.get('From')
    const body_text = params.get('Body')
    const messageSid = params.get('MessageSid')

    if (!from || !body_text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getServiceRoleClient()

    // Translate the incoming message
    const translation = await translateToEnglish(body_text)

    // Find or create conversation
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone_number', from)
      .single()

    if (convError && convError.code !== 'PGRST116') {
      // Error other than "not found"
      console.error('Database error:', convError)
      throw convError
    }

    if (!conversation) {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          phone_number: from,
          detected_language: translation.detectedLanguage,
          status: 'new',
        })
        .select()
        .single()

      if (createError) throw createError
      conversation = newConv
    } else {
      // Update detected language if message is not in English
      if (!translation.isEnglish) {
        await supabase
          .from('conversations')
          .update({ detected_language: translation.detectedLanguage })
          .eq('id', conversation.id)
      }
    }

    // Insert the message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'inbound',
        original_text: body_text,
        translated_text: translation.translatedText,
        detected_language: translation.detectedLanguage,
        translation_error: translation.error || null,
        status: 'sent',
        twilio_sid: messageSid,
      })

    if (messageError) throw messageError

    // Respond to Twilio with empty TwiML (no auto-reply)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
