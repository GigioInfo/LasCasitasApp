import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hoiahuvurtypuyfircds.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvaWFodXZ1cnR5cHV5ZmlyY2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MTU0NDksImV4cCI6MjA4MDA5MTQ0OX0.CEBS2UMyNg-a162XwNgeiuSqF5UK0iU1-VCwFVLnchg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);