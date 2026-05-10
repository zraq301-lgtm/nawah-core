import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // إضافة تيلوند كمكون إضافي لـ Vite لضمان معالجة الكلاسات أثناء الـ Build
    tailwindcss(),
  ],
  build: {
    // تحديد مجلد الإخراج ليتوافق مع مسار الأكشن (dist)
    outDir: 'dist',
    // تحسين معالجة الملفات الكبيرة لتجنب أخطاء الذاكرة في الأكشن
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  // لضمان عمل المسارات بشكل صحيح عند التشغيل على الأندرويد (Capacitor)
  base: './',
})
