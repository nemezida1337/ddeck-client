# Android third-party notices

The Android application bundles these libraries (Maven coordinates as declared in
`app/build.gradle.kts` and `protocol/build.gradle.kts`):

Direct dependencies:

- AndroidX Core (`androidx.core:core-ktx`) — Apache-2.0;
- ZXing Android Embedded (`com.journeyapps:zxing-android-embedded`) — Apache-2.0;
- OkHttp (`com.squareup.okhttp3:okhttp`) — Apache-2.0;
- Kotlin stdlib — Apache-2.0.

Transitive runtime libraries (all Apache-2.0 unless noted):

- AndroidX annotation, collection, concurrent-futures, interpolator, lifecycle,
  profileinstaller, startup-runtime, tracing, versionedparcelable, arch-core;
- Okio (`com.squareup.okio`) — Apache-2.0;
- ZXing Core (`com.google.zxing:core`) — Apache-2.0;
- kotlinx-coroutines — Apache-2.0;
- Guava `listenablefuture` — Apache-2.0;
- JetBrains annotations — Apache-2.0.

The Apache License 2.0 text is the repository's root `LICENSE`; it applies to all
libraries above. Exact resolved versions are printed by:

```sh
cd android
./gradlew :app:dependencies --configuration releaseRuntimeClasspath
```

No GPL/AGPL library is bundled in the Android app.
