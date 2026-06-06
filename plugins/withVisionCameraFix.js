const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const FIX_MARKER = '# Fix VisionCamera v5 / NitroModules Swift compilation on iOS 26 SDK';

const FIX_CODE = `
  ${FIX_MARKER}
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
`;

const withVisionCameraFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      if (podfileContent.includes(FIX_MARKER)) {
        return config;
      }

      // Insert fix code inside the existing post_install block.
      // CocoaPods only allows one post_install block, so we cannot add a new one.
      if (podfileContent.includes('post_install do |installer|')) {
        podfileContent = podfileContent.replace(
          'post_install do |installer|',
          `post_install do |installer|\n${FIX_CODE}`
        );
      } else {
        // No existing post_install block — add one
        podfileContent += `\npost_install do |installer|\n${FIX_CODE}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfileContent);
      return config;
    },
  ]);
};

module.exports = withVisionCameraFix;
