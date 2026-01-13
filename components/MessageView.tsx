'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Conversation, Message, Volunteer } from '@/lib/supabase'

type Props = {
  conversationId: string
  volunteer: Volunteer | null
  onBack: () => void
  onArchive: () => void
}

export function MessageView({ conversationId, volunteer, onBack, onArchive }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [contactName, setContactName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversation()
    loadMessages()

    // Subscribe to realtime message updates
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadMessages()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadConversation() {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (data) {
      setConversation(data)
      setContactName(data.contact_name || '')
    }
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!messageText.trim() || !volunteer) return

    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageText: messageText.trim(),
          volunteerId: volunteer.id,
          volunteerName: volunteer.display_name,
        }),
      })

      const result = await response.json()

      if (result.translationError) {
        // Let user decide what to do
        const proceed = confirm(
          `Translation failed: ${result.translationError}\n\nDo you want to send the message in English anyway?`
        )

        if (!proceed) {
          setSending(false)
          return
        }

        // User chose to send anyway - retry without translation
        setError('Sending without translation...')
        // In real implementation, you'd need a different endpoint or flag
      }

      if (!result.success) {
        setError(result.error || 'Failed to send message')
      } else {
        setMessageText('')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function handleRetry(messageId: string) {
    // Reload the message to try again
    const message = messages.find((m) => m.id === messageId)
    if (!message || !volunteer) return

    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageText: message.original_text,
          volunteerId: volunteer.id,
          volunteerName: volunteer.display_name,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to send message')
      } else {
        // Delete the old failed message
        await supabase.from('messages').delete().eq('id', messageId)
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function handleSaveName() {
    if (!conversation) return

    await supabase
      .from('conversations')
      .update({ contact_name: contactName || null })
      .eq('id', conversationId)

    setEditingName(false)
    loadConversation()
  }

  async function handleArchive() {
    if (!conversation) return

    const newStatus = conversation.status === 'resolved' ? 'active' : 'resolved'

    await supabase
      .from('conversations')
      .update({ status: newStatus })
      .eq('id', conversationId)

    onArchive()
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="md:hidden text-gray-600 hover:text-gray-800"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                    placeholder="Enter name"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false)
                      setContactName(conversation.contact_name || '')
                    }}
                    className="text-gray-600 hover:text-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-left hover:text-blue-600"
                >
                  <div className="font-semibold text-gray-900">
                    {conversation.contact_name || 'Unknown Contact'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {conversation.phone_number}
                    {conversation.detected_language !== 'en' && (
                      <span className="ml-2 text-blue-600">
                        ({conversation.detected_language.toUpperCase()})
                      </span>
                    )}
                  </div>
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleArchive}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              conversation.status === 'resolved'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {conversation.status === 'resolved' ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => {
          const isInbound = message.direction === 'inbound'
          const hasFailed = message.status === 'failed'

          return (
            <div
              key={message.id}
              className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-md ${
                  isInbound
                    ? 'bg-white border border-gray-200'
                    : hasFailed
                    ? 'bg-red-100 border border-red-300'
                    : 'bg-blue-600 text-white'
                }`}
                style={{ borderRadius: '18px', padding: '12px 16px' }}
              >
                {isInbound && message.translated_text && (
                  <>
                    <div className="text-sm mb-2">{message.translated_text}</div>
                    <div className="text-xs text-gray-500 italic border-t border-gray-200 pt-2">
                      Original: {message.original_text}
                    </div>
                  </>
                )}

                {isInbound && !message.translated_text && message.translation_error && (
                  <>
                    <div className="text-sm mb-2">{message.original_text}</div>
                    <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded mt-2">
                      Translation error: {message.translation_error}
                    </div>
                  </>
                )}

                {isInbound && !message.translated_text && !message.translation_error && (
                  <div className="text-sm">{message.original_text}</div>
                )}

                {!isInbound && (
                  <>
                    <div className={`text-sm ${hasFailed ? 'text-gray-900' : ''}`}>
                      {message.original_text}
                    </div>
                    {message.translated_text && (
                      <div
                        className={`text-xs mt-2 pt-2 border-t ${
                          hasFailed
                            ? 'text-gray-600 border-gray-300'
                            : 'text-blue-100 border-blue-400'
                        }`}
                      >
                        Sent as: {message.translated_text}
                      </div>
                    )}
                  </>
                )}

                <div
                  className={`text-xs mt-1 ${
                    isInbound ? 'text-gray-500' : hasFailed ? 'text-gray-600' : 'text-blue-100'
                  }`}
                >
                  {new Date(message.created_at).toLocaleTimeString()}
                  {!isInbound && message.volunteer_name && ` • ${message.volunteer_name}`}
                </div>

                {hasFailed && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-red-700">
                      Failed {message.retry_count > 0 ? `(${message.retry_count} retries)` : ''}
                      {message.error_message && `: ${message.error_message}`}
                    </span>
                    <button
                      onClick={() => handleRetry(message.id)}
                      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                      disabled={sending}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message in English..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !messageText.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>

        <div className="mt-2 text-xs text-gray-500">
          Messages are automatically translated to {conversation.detected_language.toUpperCase()}
        </div>
      </div>
    </div>
  )
}
