import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function TestSupabasePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <div>
      <h1>Test Supabase Connection</h1>
      <ul>
        {todos?.map((todo, index) => (
          <li key={index}>{JSON.stringify(todo)}</li>
        ))}
      </ul>
    </div>
  )
}