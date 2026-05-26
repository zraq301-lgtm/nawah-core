import { createClient } from '@supabase/supabase-js';

// بيانات مشروعك على منصة Supabase (تجدها في إعدادات المشروع API)
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';

// تهيئة عميل سوبابيز وإتاحته للاستخدام في التطبيق
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
