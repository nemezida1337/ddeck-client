// Plugin versions are declared once here and applied by the modules.
// Versions are pinned to the pair the dsh-mobile project validates against, so a
// later app module can adopt their Gradle setup without a migration step.

plugins {
  id("com.android.library") version "8.7.3" apply false
  id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
