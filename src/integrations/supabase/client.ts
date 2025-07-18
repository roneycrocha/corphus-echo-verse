// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://mpxykuocmvlqfemnzazs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1weHlrdW9jbXZscWZlbW56YXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDYzNDIsImV4cCI6MjA2ODE4MjM0Mn0.F5NH9gxNQZhMv3sW5aSUHoHlQMZNI5pWpzX_g3gD8J8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});