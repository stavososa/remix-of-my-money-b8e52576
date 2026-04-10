import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tdbuhbppxztuloncplqj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkYnVoYnBweHp0dWxvbmNwbHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzQ4MjMsImV4cCI6MjA4NzgxMDgyM30.RrNdt0QN0-Hw8kE0oFCXj91XOdIJfEZCi-zCfWaDQwg";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});