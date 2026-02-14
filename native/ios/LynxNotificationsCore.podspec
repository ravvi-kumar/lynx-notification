Pod::Spec.new do |spec|
  spec.name         = 'LynxNotificationsCore'
  spec.version      = '0.1.0-alpha'
  spec.summary      = 'Core notifications bridge for Lynx native modules.'
  spec.homepage     = 'https://github.com/example/lynx-notifications'
  spec.license      = { :type => 'Apache-2.0' }
  spec.authors      = { 'Lynx Notifications Team' => 'dev@example.com' }
  spec.source       = { :git => 'https://github.com/example/lynx-notifications.git', :tag => spec.version.to_s }
  spec.platform     = :ios, '16.0'
  spec.source_files = 'Sources/Core/**/*.{h,m,mm,swift}'
  spec.dependency   'Lynx'
end
