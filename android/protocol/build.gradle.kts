// The gateway protocol as a reusable Android library.
//
// Deliberately free of third-party runtime dependencies: HTTP, TLS pinning, UDP
// discovery and the WebSocket framing all come from the JDK and `org.json`, which
// Android ships. That keeps the trust surface small — this code handles a device
// credential that grants full control of a computer running DeepSeek Harness.

plugins {
  id("com.android.library")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "ai.dshm.client"
  compileSdk = 36

  defaultConfig {
    minSdk = 29
    consumerProguardFiles("consumer-rules.pro")
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }

  testOptions {
    unitTests.all { test ->
      // The integration test boots the Node gateway fixture from the project root.
      test.systemProperty("dshm.client.root", rootProject.projectDir.parentFile.absolutePath)
      test.testLogging { events("passed", "failed", "skipped") }
    }
  }
}

dependencies {
  // OkHttp is the transport because the JDK client silently drops the Origin
  // header the gateway requires on every mutation (proved by a header-echo test:
  // a custom header arrived, Origin did not). It also brings connection reuse and
  // TLS pinning that hold up on mobile networks.
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  // org.json ships with Android but not with the JVM that runs unit tests, so the
  // tests bring the reference implementation instead of the stubbed android.jar.
  testImplementation("junit:junit:4.13.2")
  testImplementation("org.json:json:20240303")
}
