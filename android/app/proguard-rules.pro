# Правила R8 для release-сборки.
#
# Файл читается только когда включены isMinifyEnabled/isShrinkResources (см.
# app/build.gradle.kts), то есть в release-варианте.

# Мост страницы. Класс NativeBridge передаётся в WebView.addJavascriptInterface,
# а его методы вызываются из JavaScript по имени. R8 не должен ни удалять, ни
# переименовывать ни класс, ни методы: для страницы это строки, а не ссылки.
-keep class ai.dshm.client.app.NativeBridge { *; }
-keepclassmembers class * {
  @android.webkit.JavascriptInterface <methods>;
}

# Читаемые стектрейсы в release: без номеров строк падение на телефоне не с чем
# сопоставить, а имена исходных файлов не должны раскрывать структуру проекта.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
