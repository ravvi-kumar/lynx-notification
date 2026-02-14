import Foundation

public enum LynxNotificationsHostIntegration {
  public struct InstallationOptions {
    public let permissionProvider: NotificationPermissionProvider
    public let scheduler: LocalNotificationScheduler

    public init(
      permissionProvider: NotificationPermissionProvider = UNUserNotificationCenterPermissionProvider(),
      scheduler: LocalNotificationScheduler = UNUserNotificationCenterLocalNotificationScheduler()
    ) {
      self.permissionProvider = permissionProvider
      self.scheduler = scheduler
    }
  }

  public struct Installation {
    public let module: LynxNotificationsModule
    public let events: LynxNotificationsEventForwarder

    public init(module: LynxNotificationsModule, events: LynxNotificationsEventForwarder) {
      self.module = module
      self.events = events
    }
  }

  public static func install(
    moduleRegistrar: LynxNotificationsInstaller.ModuleRegistrar,
    methodAuthRegistrar: LynxNotificationsInstaller.MethodAuthRegistrar,
    options: InstallationOptions = InstallationOptions()
  ) -> Installation {
    let providers = PushTokenProviderRegistry()
    providers.register(name: "fcm", provider: FcmPushTokenProvider())

    let module = LynxNotificationsModule(
      permissionProvider: options.permissionProvider,
      pushProviders: providers,
      scheduler: options.scheduler
    )
    let eventForwarder = LynxNotificationsEventForwarder(module: module)

    LynxNotificationsInstaller.install(
      moduleRegistrar: moduleRegistrar,
      methodAuthRegistrar: methodAuthRegistrar,
      module: module
    )

    return Installation(module: module, events: eventForwarder)
  }
}
