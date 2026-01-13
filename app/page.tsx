'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Conversation, Message, Volunteer } from '@/lib/supabase'
import { AuthForm } from '@/components/AuthForm'
import { ConversationList } from '@/components/ConversationList'
import { MessageView } from '@/components/MessageView'
import { VolunteerList } from '@/components/VolunteerList'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [showArchive, setShowArchive] = useState(false)

  // Check auth status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load volunteer profile
  useEffect(() => {
    if (user) {
      loadVolunteer()
      updatePresence(true)

      // Update presence on visibility change
      const handleVisibilityChange = () => {
        updatePresence(!document.hidden)
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Heartbeat to keep online status fresh
      const heartbeat = setInterval(() => {
        if (!document.hidden) {
          updatePresence(true)
        }
      }, 30000)

      return () => {
        updatePresence(false)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        clearInterval(heartbeat)
      }
    }
  }, [user])

  // Load conversations
  useEffect(() => {
    if (user) {
      loadConversations()
      loadVolunteers()

      // Subscribe to realtime updates
      const conversationsChannel = supabase
        .channel('conversations-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations' },
          () => {
            loadConversations()
          }
        )
        .subscribe()

      const volunteersChannel = supabase
        .channel('volunteers-changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'volunteers' },
          () => {
            loadVolunteers()
          }
        )
        .subscribe()

      return () => {
        conversationsChannel.unsubscribe()
        volunteersChannel.unsubscribe()
      }
    }
  }, [user, showArchive])

  async function loadVolunteer() {
    const { data } = await supabase
      .from('volunteers')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) setVolunteer(data)
  }

  async function loadConversations() {
    const status = showArchive ? 'resolved' : ['new', 'active']
    const query = supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })

    if (Array.isArray(status)) {
      query.in('status', status)
    } else {
      query.eq('status', status)
    }

    const { data } = await query
    if (data) setConversations(data)
  }

  async function loadVolunteers() {
    const { data } = await supabase
      .from('volunteers')
      .select('*')
      .order('display_name')
    if (data) setVolunteers(data)
  }

  async function updatePresence(isOnline: boolean) {
    if (user) {
      await supabase
        .from('volunteers')
        .update({ is_online: isOnline, last_seen: new Date().toISOString() })
        .eq('id', user.id)
    }
  }

  async function handleSignOut() {
    await updatePresence(false)
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-xl font-bold">Kids Ride Hotline</h1>
          <p className="text-sm text-blue-100">
            {volunteer?.display_name || volunteer?.email}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm font-medium"
        >
          Sign Out
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Conversations */}
        <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Archive toggle */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => setShowArchive(false)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                  !showArchive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inbox
              </button>
              <button
                onClick={() => setShowArchive(true)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                  showArchive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Archive
              </button>
            </div>
          </div>

          {/* Volunteer list */}
          <VolunteerList volunteers={volunteers} />

          {/* Conversation list */}
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation}
            onSelect={setSelectedConversation}
          />
        </div>

        {/* Main area - Messages */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <MessageView
              conversationId={selectedConversation}
              volunteer={volunteer}
              onBack={() => setSelectedConversation(null)}
              onArchive={() => {
                setSelectedConversation(null)
                loadConversations()
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-lg">Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
