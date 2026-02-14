import Foundation

public enum LynxNotificationsHostIntegration {
  public struct InstallationOptions {
    public let permissionStateReader: RuntimeNotificationPermissionProvider.PermissionStateReader
    public let permissionRequestLauncher: RuntimeNotificationPermissionProvider.PermissionRequestLauncher?
    public let scheduler: LocalNotificationScheduler

    public init(
      permissionStateReader: @escaping RuntimeNotificationPermissionProvider.PermissionStateReader,
      permissionRequestLauncher: RuntimeNotificationPermissionProvider.PermissionRequestLauncher?,
      scheduler: LocalNotificationScheduler
    ) {
      self.permissionStateReader = permissionStateReader
      self.permissionRequestLauncher = permissionRequestLauncher
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
    options: InstallationOptions
  ) -> Installation {
    let permissionProvider = RuntimeNotificationPermissionProvider(
      stateReader: options.permissionStateReader,
      requestLauncher: options.permissionRequestLauncher
    )

    let providers = PushTokenProviderRegistry()
    providers.register(name: "fcm", provider: FcmPushTokenProvider())

    let module = LynxNotificationsModule(
      permissionProvider: permissionProvider,
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
