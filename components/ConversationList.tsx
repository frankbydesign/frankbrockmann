'use client'

import type { Conversation } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ConversationList({ conversations, selectedId, onSelect }: Props) {
  const [volunteers, setVolunteers] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    loadVolunteerNames()
  }, [conversations])

  async function loadVolunteerNames() {
    const volunteerIds = conversations
      .map((c) => c.last_reply_by)
      .filter(Boolean) as string[]

    if (volunteerIds.length === 0) return

    const { data } = await supabase
      .from('volunteers')
      .select('id, display_name')
      .in('id', volunteerIds)

    if (data) {
      const nameMap: { [key: string]: string } = {}
      data.forEach((v) => {
        nameMap[v.id] = v.display_name || 'Unknown'
      })
      setVolunteers(nameMap)
    }
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-400 text-center">
        <div>
          <p className="text-lg mb-2">No conversations yet</p>
          <p className="text-sm">Waiting for messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        const isSelected = conversation.id === selectedId
        const statusColor = {
          new: 'bg-blue-500',
          active: 'bg-yellow-500',
          resolved: 'bg-green-500',
        }[conversation.status]

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 text-left transition-colors ${
              isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                <span className="font-semibold text-gray-900">
                  {conversation.contact_name || conversation.phone_number}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {formatTime(conversation.updated_at)}
              </span>
            </div>

            {!conversation.contact_name && (
              <div className="text-sm text-gray-600 mb-1">
                {conversation.phone_number}
              </div>
            )}

            {conversation.detected_language !== 'en' && (
              <div className="text-xs text-blue-600 mb-1">
                Language: {conversation.detected_language.toUpperCase()}
              </div>
            )}

            {conversation.last_reply_by && conversation.last_reply_at && (
              <div className="text-xs text-gray-500">
                Last reply by {volunteers[conversation.last_reply_by] || 'Unknown'}{' '}
                {formatTime(conversation.last_reply_at)}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
