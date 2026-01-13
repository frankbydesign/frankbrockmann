'use client'

import type { Volunteer } from '@/lib/supabase'

type Props = {
  volunteers: Volunteer[]
}

export function VolunteerList({ volunteers }: Props) {
  const onlineVolunteers = volunteers.filter((v) => v.is_online)

  if (onlineVolunteers.length === 0) {
    return null
  }

  return (
    <div className="p-4 border-b border-gray-200 bg-green-50">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-gray-700">
          {onlineVolunteers.length} Online
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {onlineVolunteers.map((volunteer) => (
          <div
            key={volunteer.id}
            className="flex items-center gap-1 bg-white px-2 py-1 rounded-full text-xs border border-green-200"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">{volunteer.display_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
