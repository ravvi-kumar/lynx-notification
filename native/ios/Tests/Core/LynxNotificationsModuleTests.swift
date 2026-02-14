import Foundation
import XCTest
@testable import LynxNotificationsCore

final class LynxNotificationsModuleTests: XCTestCase {
  func testRuntimePermissionDeniedMapping() {
    let module = LynxNotificationsModule(
      permissionProvider: RuntimeNotificationPermissionProvider(
        stateReader: { (granted: false, canAskAgain: false) },
        requestLauncher: { completion in
          completion(.success(false))
        }
      ),
      pushProviders: PushTokenProviderRegistry(),
      scheduler: InMemoryLocalNotificationScheduler()
    )

    let expectation = expectation(description: "permission callback")
    module.requestPermissions { payload in
      let ok = payload["ok"] as? Bool
      XCTAssertEqual(ok, true)

      let data = payload["data"] as? [String: Any]
      XCTAssertEqual(data?["status"] as? String, "denied")
      XCTAssertEqual(data?["granted"] as? Bool, false)
      XCTAssertEqual(data?["canAskAgain"] as? Bool, false)
      expectation.fulfill()
    }

    wait(for: [expectation], timeout: 1)
  }

  func testPushTokenSuccess() {
    let providers = PushTokenProviderRegistry()
    providers.register(name: "fcm", provider: FakePushTokenProvider(result: .success(PushToken(type: "fcm", data: "token-123"))))

    let module = LynxNotificationsModule(
      permissionProvider: NoopPermissionProvider(),
      pushProviders: providers,
      scheduler: InMemoryLocalNotificationScheduler()
    )

    let expectation = expectation(description: "push token callback")
    module.getPushToken(provider: "fcm") { payload in
      let ok = payload["ok"] as? Bool
      XCTAssertEqual(ok, true)

      let data = payload["data"] as? [String: Any]
      XCTAssertEqual(data?["type"] as? String, "fcm")
      XCTAssertEqual(data?["data"] as? String, "token-123")
      expectation.fulfill()
    }

    wait(for: [expectation], timeout: 1)
  }

  func testMissingProviderReturnsError() {
    let module = LynxNotificationsModule(
      permissionProvider: NoopPermissionProvider(),
      pushProviders: PushTokenProviderRegistry(),
      scheduler: InMemoryLocalNotificationScheduler()
    )

    let expectation = expectation(description: "provider error callback")
    module.getPushToken(provider: "fcm") { payload in
      let ok = payload["ok"] as? Bool
      XCTAssertEqual(ok, false)

      let error = payload["error"] as? [String: Any]
      XCTAssertEqual(error?["code"] as? String, "ERR_PROVIDER_UNCONFIGURED")
      expectation.fulfill()
    }

    wait(for: [expectation], timeout: 1)
  }

  func testSchedulePastDateReturnsInvalidArgument() {
    let module = LynxNotificationsModule(
      permissionProvider: NoopPermissionProvider(),
      pushProviders: PushTokenProviderRegistry(),
      scheduler: InMemoryLocalNotificationScheduler()
    )

    let request: [String: Any] = [
      "trigger": [
        "type": "date",
        "date": NSNumber(value: Date().timeIntervalSince1970 * 1000 - 1000),
      ],
    ]

    let expectation = expectation(description: "schedule callback")
    module.scheduleNotification(request: request) { payload in
      let ok = payload["ok"] as? Bool
      XCTAssertEqual(ok, false)

      let error = payload["error"] as? [String: Any]
      XCTAssertEqual(error?["code"] as? String, "ERR_INVALID_ARGUMENT")
      expectation.fulfill()
    }

    wait(for: [expectation], timeout: 1)
  }
}

private final class FakePushTokenProvider: PushTokenProvider {
  private let result: Result<PushToken, NotificationError>

  init(result: Result<PushToken, NotificationError>) {
    self.result = result
  }

  func getToken(_ completion: @escaping (Result<PushToken, NotificationError>) -> Void) {
    completion(result)
  }
}
