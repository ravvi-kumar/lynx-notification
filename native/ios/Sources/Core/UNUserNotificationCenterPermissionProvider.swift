import Foundation
import UserNotifications

public final class UNUserNotificationCenterPermissionProvider: NotificationPermissionProvider {
  private let center: UNUserNotificationCenter
  private let authorizationOptions: UNAuthorizationOptions

  public init(
    center: UNUserNotificationCenter = .current(),
    authorizationOptions: UNAuthorizationOptions = [.alert, .sound, .badge]
  ) {
    self.center = center
    self.authorizationOptions = authorizationOptions
  }

  public func getPermissions(_ completion: @escaping (Result<NotificationPermissions, NotificationError>) -> Void) {
    center.getNotificationSettings { settings in
      LynxNotificationsLogger.debug("Fetched UNUserNotificationCenter permission settings.")
      completion(.success(Self.map(settings)))
    }
  }

  public func requestPermissions(_ completion: @escaping (Result<NotificationPermissions, NotificationError>) -> Void) {
    center.requestAuthorization(options: authorizationOptions) { _, error in
      if let error {
        LynxNotificationsLogger.error(
          "UNUserNotificationCenter permission request failed: \(error.localizedDescription)"
        )
        completion(.failure(NotificationError.from(error)))
        return
      }

      LynxNotificationsLogger.debug("UNUserNotificationCenter permission request completed.")
      self.getPermissions(completion)
    }
  }

  private static func map(_ settings: UNNotificationSettings) -> NotificationPermissions {
    switch settings.authorizationStatus {
    case .authorized, .provisional, .ephemeral:
      return NotificationPermissions(status: "granted", granted: true, canAskAgain: true)
    case .denied:
      return NotificationPermissions(status: "denied", granted: false, canAskAgain: false)
    case .notDetermined:
      return NotificationPermissions(status: "undetermined", granted: false, canAskAgain: true)
    @unknown default:
      return NotificationPermissions(status: "undetermined", granted: false, canAskAgain: true)
    }
  }
}
