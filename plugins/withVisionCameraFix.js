const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo config plugin that adds a post_install hook to Podfile.
 * Fixes VisionCamera v5 Swift compilation issues on iOS 26 SDK by:
 * - Setting SWIFT_STRICT_CONCURRENCY = minimal for VisionCamera and NitroModules pods
 * - Disabling DebugDescriptionMacro experimental feature that breaks generated Nitrogen Swift files
 */
const withVisionCameraFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      const hookContent = `
# Fix VisionCamera v5 / NitroModules Swift compilation on iOS 26 SDK
post_install do |installer|
  installer.pods_project.targets.each do |target|
    if ['VisionCamera', 'NitroModules', 'NitroImage', 'RNWorklets'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        other_swift_flags = config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'
        other_swift_flags = other_swift_flags.gsub('-enable-experimental-feature DebugDescriptionMacro', '')
        config.build_settings['OTHER_SWIFT_FLAGS'] = other_swift_flags
      end
    end
  end
end
`;

      if (!podfileContent.includes('Fix VisionCamera v5 / NitroModules')) {
        podfileContent += hookContent;
        fs.writeFileSync(podfilePath, podfileContent);
      }

      return config;
    },
  ]);
};

module.exports = withVisionCameraFix;
