import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { supabase } from '@/lib/supabase'
import { translateFromEnglish } from '@/lib/translate'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const MAX_RETRIES = 3

/**
 * Send SMS endpoint - sends outbound messages with translation and retry logic
 */
export async function POST(request: NextRequest) {
  try {
    const { conversationId, messageText, volunteerId, volunteerName } = await request.json()

    if (!conversationId || !messageText || !volunteerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Translate the message to the parent's language
    const translation = await translateFromEnglish(
      messageText,
      conversation.detected_language
    )

    if (translation.error) {
      // Translation failed - return error to let volunteer decide
      return NextResponse.json({
        success: false,
        translationError: translation.error,
        originalText: messageText,
      })
    }

    const textToSend = translation.translatedText || messageText

    // Create message record with pending status
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        direction: 'outbound',
        original_text: messageText,
        translated_text: translation.translatedText,
        status: 'pending',
        volunteer_id: volunteerId,
        volunteer_name: volunteerName,
        retry_count: 0,
      })
      .select()
      .single()

    if (messageError || !message) {
      throw new Error('Failed to create message record')
    }

    // Try sending with retry logic
    let lastError: string | null = null
    let twilioSid: string | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const twilioMessage = await twilioClient.messages.create({
          body: textToSend,
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: conversation.phone_number,
        })

        twilioSid = twilioMessage.sid
        lastError = null
        break // Success!
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Send attempt ${attempt + 1} failed:`, lastError)

        // Update retry count
        await supabase
          .from('messages')
          .update({ retry_count: attempt + 1 })
          .eq('id', message.id)

        // Wait before retrying (exponential backoff)
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    // Update message status based on result
    const finalStatus = lastError ? 'failed' : 'sent'
    await supabase
      .from('messages')
      .update({
        status: finalStatus,
        twilio_sid: twilioSid,
        error_message: lastError,
      })
      .eq('id', message.id)

    // Update conversation metadata
    if (!lastError) {
      await supabase
        .from('conversations')
        .update({
          last_reply_by: volunteerId,
          last_reply_at: new Date().toISOString(),
          status: 'active',
        })
        .eq('id', conversationId)
    }

    return NextResponse.json({
      success: !lastError,
      messageId: message.id,
      error: lastError,
      translatedText: translation.translatedText,
    })
  } catch (error) {
    console.error('Send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
