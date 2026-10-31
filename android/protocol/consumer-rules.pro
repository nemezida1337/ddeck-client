# Keep the protocol contract intact for consumers that build with R8.
# Nothing here is reflection-driven, but the public surface is the client API.
-keep class ai.dshm.client.** { *; }
