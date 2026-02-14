import Foundation

public enum LynxNotificationsInstaller {
  public static func install(
    moduleRegistrar: ModuleRegistrar,
    methodAuthRegistrar: MethodAuthRegistrar,
    module: LynxNotificationsModule
  ) {
    moduleRegistrar.register(moduleName: "LynxNotificationsModule", moduleInstance: module)

    methodAuthRegistrar.register { _, moduleName, _, _ in
      LynxNotificationsMethodAuth.verify(module: moduleName)
    }
  }

  public protocol ModuleRegistrar {
    func register(moduleName: String, moduleInstance: Any)
  }

  public protocol MethodAuthRegistrar {
    func register(_ validator: @escaping MethodAuthValidator)
  }

  public typealias MethodAuthValidator = (_ method: String, _ module: String, _ invokeSession: String, _ invocation: Any?) -> Bool
}
