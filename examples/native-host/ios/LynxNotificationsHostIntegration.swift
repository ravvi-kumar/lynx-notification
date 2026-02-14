import Foundation

public enum LynxNotificationsHostIntegration {
  public static func install(
    moduleRegistrar: LynxNotificationsInstaller.ModuleRegistrar,
    methodAuthRegistrar: LynxNotificationsInstaller.MethodAuthRegistrar
  ) {
    let provider = FcmPushTokenProvider(tokenFetcher: {
      // Replace with FirebaseMessaging token retrieval.
      "replace-with-real-fcm-token"
    })

    let module = LynxNotificationsModule.createDefault(fcmProvider: provider)

    LynxNotificationsInstaller.install(
      moduleRegistrar: moduleRegistrar,
      methodAuthRegistrar: methodAuthRegistrar,
      module: module
    )
  }
}
