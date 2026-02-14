# Native Integration Notes

## Bridge Module

Register native module name: `LynxNotificationsModule`

Contract reference: `native/CONTRACT.md`

## iOS Registration

When using Lynx SDK 3.5+, register method auth validator and allow only notifications module methods for the target LynxView.

```objective-c
LynxViewBuilder *builder = GetLynxViewBuilder();
[builder.config registerMethodAuth:^BOOL(NSString *method, NSString *module, NSString *invokeSession, NSInvocation *inv) {
  if ([module isEqualToString:@"LynxNotificationsModule"]) {
    return YES;
  }
  return NO;
}];
```

## Android Registration

When using Lynx SDK 3.5+, register module auth validator and allow only notifications module methods for the target LynxView.

```java
LynxViewBuilder builder = LynxView.builder()
  .registerModuleAuthValidator((moduleName, methodName, methodParams) -> {
    return "LynxNotificationsModule".equals(moduleName);
  });
```

## FCM Adapters

- Android adapter template: `native/android/fcm/src/main/java/io/lynx/notifications/fcm/FcmPushTokenProvider.java`
- iOS adapter template: `native/ios/Sources/FCM/FcmPushTokenProvider.swift`

Replace templates with Firebase token retrieval and callback envelope conversion.
