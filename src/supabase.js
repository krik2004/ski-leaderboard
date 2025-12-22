import { createClient } from '@supabase/supabase-js'

// ВАЖНО: Замените эти значения на свои!
const supabaseUrl = 'https://xsqelqxwthjufdwfdecf.supabase.co'
const supabaseKey = 'sb_publishable_XTAAbOUtNz-UyekvCQMB-A_dzlGjS1O'

// Создаем клиент Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
