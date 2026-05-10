name: "Nawah AI-OS Professional Build Pipeline"

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: 1. Checkout Code
        uses: actions/checkout@v4

      - name: 2. Setup Node.js (v22)
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: 3. Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: 4. Build Web Project (Vite)
        run: |
          npm install --legacy-peer-deps
          npm run build
          # ضمان المزامنة مع مجلد www المطلوب لـ Capacitor
          mkdir -p www
          cp -r dist/* www/

      - name: 5. Clean & Rebuild Android Platform
        run: |
          rm -rf android
          npx cap add android
          npx cap sync android

      - name: 6. Inject Nawah Identity & Firebase
        run: |
          mkdir -p android/app/
          # حقن ملف google-services مع تحديث المعرف الجديد
          cat <<EOF > android/app/google-services.json
          {
            "project_info": { "project_number": "162488255991", "project_id": "nawah-aios" },
            "client": [ { "client_info": { "mobilesdk_app_id": "1:162488255991:android:73d6299f11a1b7aec61af2", "android_client_info": { "package_name": "com.nawah.aios" } }, "api_key": [ { "current_key": "AIzaSyAKjsgnoHnGGr3urhm6Kpu7RvxN2dp6sJQ" } ], "services": { "appinvite_service": { "other_platform_oauth_client": [] } } } ],
            "configuration_version": "1"
          }
          EOF
          
          # تحديث الـ Namespace والـ Application ID برمجياً ليتوافق مع Nawah
          sed -i 's/namespace ".*"/namespace "com.nawah.aios"/' android/app/build.gradle
          sed -i 's/applicationId ".*"/applicationId "com.nawah.aios"/' android/app/build.gradle
          
          # تحديث اسم التطبيق في موارد الأندرويد
          STRINGS="android/app/src/main/res/values/strings.xml"
          if [ -f "$STRINGS" ]; then
            sed -i 's/<string name="app_name">.*<\/string>/<string name="app_name">Nawah AI-OS<\/string>/' $STRINGS
          fi

      - name: 7. Native Android Compilation
        working-directory: ./android
        run: |
          chmod +x gradlew
          # حل تعارضات المكتبات الشائعة وزيادة سعة الذاكرة
          echo "configurations.all { resolutionStrategy.eachDependency { details -> if (details.requested.name == 'bcprov-jdk18on') { details.useVersion '1.78.1' } } }" >> build.gradle
          ./gradlew assembleRelease --no-daemon -Dorg.gradle.jvmargs="-Xmx3072m"

      - name: 8. Sign APK (Professional Mode)
        run: |
          # إنشاء مفتاح توقيع مؤقت للمشروع الجديد
          keytool -genkey -v -keystore nawah.jks -alias nawah_alias -keyalg RSA -keysize 2048 -validity 10000 -storepass "nawah_pass_2026" -keypass "nawah_pass_2026" -dname "CN=NawahTeam, O=Nawah, C=EG" -noprompt
          
          APK_PATH=$(find android/app/build/outputs/apk/release/ -name "*.apk" | head -n 1)
          BUILD_TOOLS_VERSION=$(ls $ANDROID_HOME/build-tools | tail -n 1)
          
          # التوقيع النهائي للملف
          $ANDROID_HOME/build-tools/$BUILD_TOOLS_VERSION/apksigner sign --ks nawah.jks --ks-pass pass:"nawah_pass_2026" --out Nawah-AIOS-Final.apk "$APK_PATH"

      - name: 9. Deploy to GitHub Releases
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v2.0.${{ github.run_number }}
          name: "Nawah AI-OS Release v2.0.${{ github.run_number }}"
          body: |
            ### 🚀 New Release Highlights
            - Transitioned to Nawah AI-OS Ecosystem.
            - Optimized Build Pipeline with Node.js 22.
            - Enhanced Android integration and signing.
          files: Nawah-AIOS-Final.apk
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
