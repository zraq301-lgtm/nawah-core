import { createClient } from '@supabase/supabase-js';

// 1. قراءة رابط مشروع سوبابيز ديناميكياً من الأسرار
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// 2. قراءة مفتاح الـ anon ديناميكياً من الأسرار
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 3. تهيئة عميل سوبابيز وتصديره ليتم استدعاؤه في الملفات الأخرى
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
