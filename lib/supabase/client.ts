import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://rbuxsuuvbeojxcxwxcjf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidXhzdXV2YmVvanhjeHd4Y2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjgwOTQsImV4cCI6MjA5MDkwNDA5NH0.pT2RSSHxwoQJbTCaqpkgtANbLktNd7c5e6Qu_9jSBWg'
  )
}