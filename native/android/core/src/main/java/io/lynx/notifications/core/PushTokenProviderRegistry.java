package io.lynx.notifications.core;

import java.util.HashMap;
import java.util.Map;

public final class PushTokenProviderRegistry {
  private final Map<String, PushTokenProvider> providers = new HashMap<>();

  public void register(String providerName, PushTokenProvider provider) {
    providers.put(providerName, provider);
  }

  public PushTokenProvider get(String providerName) {
    return providers.get(providerName);
  }
}
