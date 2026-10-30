// Gradle entry point for the Android side of ddeck.
// The protocol layer is a library module: the app shell that will use it depends
// on the client path still being chosen (web-UI shell, native shell, or hybrid),
// so the transport is kept buildable and independent of that decision.

pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositories {
    google()
    mavenCentral()
  }
}

rootProject.name = "ddeck"
include(":protocol")
include(":app")
