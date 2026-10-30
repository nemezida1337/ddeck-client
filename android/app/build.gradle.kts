// Android-оболочка: WebView вокруг мобильного интерфейса компьютера и те нативные
// возможности, которых нет у браузера (сопряжение, защищённое хранилище учётных
// данных, уведомления, сканирование QR).
//
// Путь C оставляет сам интерфейс в веб-слое, который отдаёт плагин, поэтому модуль
// остаётся тонким: подключение, учётные данные и мост.

import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

/**
 * Подписывающие материалы намеренно лежат вне репозитория: утёкший upload-ключ
 * позволяет публиковать обновления от чужого имени, а потерянный — отнимает
 * возможность обновлять приложение. `keystore.properties` в .gitignore; без него
 * release-сборка просто остаётся неподписанной, что и делает CI, и поэтому в
 * Gradle-файлах нет секретов.
 */
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
  if (keystorePropertiesFile.exists()) keystorePropertiesFile.inputStream().use { load(it) }
}

/**
 * Версия, записанная один раз.
 *
 * `versionCode` сравнивает Play, и он обязан расти с каждой загрузкой; имя вроде
 * 1.4.2 читает человек. Вывод одного из другого по фиксированному правилу
 * (`MAJOR * 10000 + MINOR * 100 + PATCH`) не даёт им разъехаться — обычная причина
 * отказа в публикации из-за устаревшего versionCode.
 */
val versionMajor = 0
val versionMinor = 9
val versionPatch = 1

/** Суффикс беты; для стабильного 1.0 убрать. */
val versionSuffix = "-beta"

android {
  namespace = "ai.dshm.client.app"
  compileSdk = 36

  // Оболочка читает BuildConfig.DEBUG: в debug-сборке WebView открыт для
  // chrome://inspect, в release — закрыт.
  buildFeatures {
    buildConfig = true
  }

  defaultConfig {
    applicationId = "app.ddeck.client"
    minSdk = 29
    targetSdk = 36
    versionCode = versionMajor * 10_000 + versionMinor * 100 + versionPatch
    versionName = "$versionMajor.$versionMinor.$versionPatch$versionSuffix"
  }

  signingConfigs {
    if (keystorePropertiesFile.exists()) {
      create("release") {
        storeFile = file(keystoreProperties.getProperty("storeFile"))
        storePassword = keystoreProperties.getProperty("storePassword")
        keyAlias = keystoreProperties.getProperty("keyAlias")
        keyPassword = keystoreProperties.getProperty("keyPassword")
      }
    }
  }

  buildTypes {
    release {
      // Сжатие и обфускация кода: release-APK уходит людям, и в нём не должно быть
      // ни отладочных имён, ни неиспользуемого кода. Мост страницы защищён
      // правилами в proguard-rules.pro — без них R8 переименует методы, которые
      // JavaScript вызывает по имени.
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      // Только когда ключ действительно настроен: в CI без keystore release тоже
      // должен собираться.
      signingConfig = signingConfigs.findByName("release")
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  lint {
    // Ошибки lint ломают release-сборку, предупреждения — нет: «зелёная» сборка не
    // должна означать «предупреждений нет», но и не должна падать из-за стиля.
    abortOnError = true
    checkReleaseBuilds = true
    warningsAsErrors = false
  }
}

kotlin {
  compilerOptions {
    jvmTarget.set(JvmTarget.JVM_17)
  }
}

dependencies {
  implementation(project(":protocol"))
  implementation("androidx.core:core-ktx:1.13.1")
  // QR-сканирование без Play Services: самостоятельная активити-камера.
  implementation("com.journeyapps:zxing-android-embedded:4.3.0")
}
