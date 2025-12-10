import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yfkycqacybprcffnuuna.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlma3ljcWFjeWJwcmNmZm51dW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NzM0NjgsImV4cCI6MjA3OTE0OTQ2OH0.3f73DEEaeWVuUeLL9PM3619p5QG-DVB_Iq2_kh_E_X8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWorker() {
    const email = 'junioralba99@gmail.com';
    console.log(`Checking status for ${email}...`);

    const { data, error } = await supabase
        .from('workers')
        .select('id, name, is_active, dashboard_permission')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Worker Details:');
        console.log('----------------');
        console.log(`Name: ${data.name}`);
        console.log(`Active: ${data.is_active}`);
        console.log(`Permission: ${data.dashboard_permission}`);
    }
}

checkWorker();
