import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xsqelqxwthjufdwfdecf.supabase.co'
const supabaseKey =
	process.env.REACT_APP_SUPABASE_ANON_KEY ||
	'sb_publishable_XTAAbOUtNz-UyekvCQMB-A_dzlGjS1O'

export const supabase = createClient(supabaseUrl, supabaseKey)
