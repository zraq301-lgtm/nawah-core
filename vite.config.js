import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // تسهيل استدعاء الملفات باستخدام @ بدلاً من المسارات النسبية الطويلة
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    // تحديد المجلد النهائي ليتوافق مع إعدادات Capacitor
    outDir: 'dist',
    // تحسين الأداء وتصغير حجم الملفات
    minify: 'terser',
    terserOptions: {
      compress: {
        // حذف الـ console.log في نسخة الإنتاج لزيادة الخصوصية والأداء
        drop_console: true,
        drop_debugger: true,
      },
    },
    // تقسيم الكود (Code Splitting) لضمان سرعة التحميل
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['axios', 'luxon', 'sweetalert2'],
        },
      },
    },
    // زيادة التوافق مع المتصفحات القديمة نوعاً ما
    target: 'esnext',
    sourcemap: false,
  },
  server: {
    // إعدادات السيرفر المحلي
    port: 3000,
    host: true, // مهم لتجربة التطبيق على المتصفح من الموبايل عبر الشبكة المحلية
    open: true,
  },
});
