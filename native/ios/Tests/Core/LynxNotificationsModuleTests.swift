import Foundation
import XCTest

final class LynxNotificationsModuleTests: XCTestCase {
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
