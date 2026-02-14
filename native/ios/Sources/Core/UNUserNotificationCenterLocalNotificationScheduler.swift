import Foundation
import UserNotifications

public final class UNUserNotificationCenterLocalNotificationScheduler: LocalNotificationScheduler {
  private let center: UNUserNotificationCenter

  public init(center: UNUserNotificationCenter = .current()) {
    self.center = center
  }

  public func schedule(
    request: [String: Any],
    completion: @escaping (Result<String, NotificationError>) -> Void
  ) {
    do {
      let id = "notification-\(UUID().uuidString.lowercased())"
      let content = try buildContent(from: request)
      let trigger = try buildTrigger(from: request)
      let notificationRequest = UNNotificationRequest(identifier: id, content: content, trigger: trigger)

      center.add(notificationRequest) { error in
        if let error {
          LynxNotificationsLogger.error(
            "UNUserNotificationCenter schedule failed: \(error.localizedDescription)"
          )
          completion(.failure(NotificationError.from(error)))
          return
        }

        LynxNotificationsLogger.debug("UNUserNotificationCenter scheduled notification id=\(id)")
        completion(.success(id))
      }
    } catch {
      LynxNotificationsLogger.error("UNUserNotificationCenter schedule failed: \(error.localizedDescription)")
      completion(.failure(NotificationError.from(error)))
    }
  }

  public func cancel(id: String, completion: @escaping (Result<Void, NotificationError>) -> Void) {
    guard !id.isEmpty else {
      completion(.failure(NotificationError(
        code: "ERR_INVALID_ARGUMENT",
        message: "Scheduled notification id must not be empty."
      )))
      return
    }

    center.removePendingNotificationRequests(withIdentifiers: [id])
    center.removeDeliveredNotifications(withIdentifiers: [id])
    LynxNotificationsLogger.debug("UNUserNotificationCenter canceled notification id=\(id)")
    completion(.success(()))
  }

  public func cancelAll(_ completion: @escaping (Result<Void, NotificationError>) -> Void) {
    center.removeAllPendingNotificationRequests()
    center.removeAllDeliveredNotifications()
    LynxNotificationsLogger.debug("UNUserNotificationCenter canceled all notifications.")
    completion(.success(()))
  }

  private func buildContent(from request: [String: Any]) throws -> UNMutableNotificationContent {
    guard let contentPayload = request["content"] as? [String: Any] else {
      throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Notification content must be an object.")
    }

    let content = UNMutableNotificationContent()
    if let title = contentPayload["title"] as? String {
      content.title = title
    }
    if let subtitle = contentPayload["subtitle"] as? String {
      content.subtitle = subtitle
    }
    if let body = contentPayload["body"] as? String {
      content.body = body
    }
    if let badge = contentPayload["badge"] as? NSNumber {
      content.badge = badge
    }

    if let sound = contentPayload["sound"] {
      if sound is NSNull {
        content.sound = nil
      } else if let soundName = sound as? String, soundName == "default" {
        content.sound = .default
      }
    }

    if let rawData = contentPayload["data"] as? [String: Any] {
      content.userInfo = sanitizeUserInfo(rawData)
    }

    return content
  }

  private func buildTrigger(from request: [String: Any]) throws -> UNNotificationTrigger? {
    let triggerValue = request["trigger"]
    if triggerValue == nil || triggerValue is NSNull {
      return nil
    }

    guard let trigger = triggerValue as? [String: Any] else {
      throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Notification trigger must be null or object.")
    }

    guard let type = trigger["type"] as? String else {
      throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Notification trigger type is required.")
    }

    if type == "date" {
      guard let dateMillis = trigger["date"] as? NSNumber else {
        throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Date trigger requires numeric date.")
      }

      if let repeats = trigger["repeats"] as? Bool, repeats {
        throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Date trigger does not support repeats=true.")
      }

      let date = Date(timeIntervalSince1970: dateMillis.doubleValue / 1000)
      if date.timeIntervalSinceNow <= 0 {
        throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Date trigger must be in the future.")
      }

      let components = Calendar.current.dateComponents(
        [.year, .month, .day, .hour, .minute, .second],
        from: date
      )
      return UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
    }

    if type == "timeInterval" {
      guard let seconds = trigger["seconds"] as? NSNumber, seconds.doubleValue > 0 else {
        throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Time interval trigger requires seconds > 0.")
      }

      let repeats = trigger["repeats"] as? Bool ?? false
      if repeats && seconds.doubleValue < 60 {
        throw NotificationError(
          code: "ERR_INVALID_ARGUMENT",
          message: "iOS repeating time interval trigger requires seconds >= 60."
        )
      }

      return UNTimeIntervalNotificationTrigger(timeInterval: seconds.doubleValue, repeats: repeats)
    }

    throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Unknown notification trigger type.")
  }

  private func sanitizeUserInfo(_ payload: [String: Any]) -> [AnyHashable: Any] {
    var sanitized: [AnyHashable: Any] = [:]
    for (key, value) in payload {
      if let normalized = normalizeUserInfoValue(value) {
        sanitized[key] = normalized
      } else {
        sanitized[key] = String(describing: value)
      }
    }
    return sanitized
  }

  private func normalizeUserInfoValue(_ value: Any) -> Any? {
    if value is NSNull {
      return nil
    }

    if let scalar = value as? String {
      return scalar
    }

    if let scalar = value as? NSNumber {
      return scalar
    }

    if let object = value as? [String: Any] {
      return sanitizeUserInfo(object)
    }

    if let array = value as? [Any] {
      return array.map { normalizeUserInfoValue($0) ?? String(describing: $0) }
    }

    return nil
  }
}
