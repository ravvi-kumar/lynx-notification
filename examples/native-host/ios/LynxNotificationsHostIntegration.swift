import Foundation

public enum LynxNotificationsHostIntegration {
  public static func install(
    moduleRegistrar: LynxNotificationsInstaller.ModuleRegistrar,
    methodAuthRegistrar: LynxNotificationsInstaller.MethodAuthRegistrar
  ) {
    let provider = FcmPushTokenProvider()

    let module = LynxNotificationsModule.createDefault(fcmProvider: provider)
    let eventForwarder = LynxNotificationsEventForwarder(module: module)

    LynxNotificationsInstaller.install(
      moduleRegistrar: moduleRegistrar,
      methodAuthRegistrar: methodAuthRegistrar,
      module: module
    )

    // Wire your host push callbacks:
    // eventForwarder.onForegroundNotificationReceived(notification: ...)
    // eventForwarder.onNotificationResponse(response: ...)
    // eventForwarder.onTokenRefreshed(token: ...)
    _ = eventForwarder
  }
}
