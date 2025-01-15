import { createClient } from '@supabase/supabase-js'
import { configDotenv } from 'dotenv'

configDotenv()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)