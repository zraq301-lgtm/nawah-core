import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  // لضمان عمل المسارات بشكل صحيح عند التشغيل على الأندرويد (Capacitor) واستضافات الويب مثل Vercel
  base: './',

  plugins: [
    react(),
    // إضافة تيلوند كمكون إضافي لـ Vite لضمان معالجة الكلاسات أثناء الـ Build
    tailwindcss(),
  ],

  build: {
    // تحديد مجلد الإخراج ليتوافق مع مسار الأكشن (dist)
    outDir: 'dist',
    
    // تحسين معالجة الملفات الكبيرة لتجنب أخطاء الذاكرة في الأكشن
    chunkSizeWarningLimit: 2000, 
    
    // ضبط الـ Rollup لضمان توليد ملفات بأشجار مسارات نظيفة ومستقرة
    rollupOptions: {
      output: {
        // تقسيم المكتبات الكبيرة لتقليل حجم الـ Chunks وتحسين الأداء
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            }
            return 'vendor-libs'; // تجميع باقي المكتبات لتقليل تشتت الملفات
          }
        },
      },
    },
  },
})
