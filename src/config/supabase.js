import { createClient } from '@supabase/supabase-js';

// 1. رابط مشروعك الحقيقي المستخرج من الـ Project ID الخاص بك
const SUPABASE_URL = 'https://nyqkojeogsmzggfgarwl.supabase.co';

// 2. مفتاح الـ anon الحقيقي والنص المشفر الكامل الذي أرسلته
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cWtvamVvZ3NtemdnZmdhcndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Mzg2OTcsImV4cCI6MjA5NTMxNDY5N30.G-8A0UhI5Eov9Bg6yyD837YjHbIQZdQaNMovIZNk5zA';

// 3. تهيئة عميل سوبابيز وتصديره ليتم استدعاؤه في الملفات الأخرى
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
