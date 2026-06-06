const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const FIX_MARKER = '# Fix VisionCamera v5 / NitroModules Swift compilation on iOS 26 SDK';

// Inserted right after 'post_install do |installer|'.
// This runs before react_native_post_install, but SWIFT_VERSION and
// SWIFT_STRICT_CONCURRENCY are not touched by react_native_post_install,
// so they won't be overridden.
const FIX_CODE = `
  ${FIX_MARKER}
  installer.pods_project.targets.each do |target|
    next unless ['VisionCamera', 'NitroModules', 'NitroImage', 'RNWorklets'].include?(target.name)
    target.build_configurations.each do |build_config|
      build_config.build_settings['SWIFT_VERSION'] = '5'
      build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      build_config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      flags = build_config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'
      flags = flags.gsub('-enable-experimental-feature DebugDescriptionMacro', '').strip
      build_config.build_settings['OTHER_SWIFT_FLAGS'] = flags.empty? ? '$(inherited)' : flags
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

      let content = fs.readFileSync(podfilePath, 'utf-8');

      if (content.includes(FIX_MARKER)) {
        return config;
      }

      const HOOK_OPEN = 'post_install do |installer|';
      if (!content.includes(HOOK_OPEN)) {
        // No existing post_install block — add a new one at the end
        content += `\npost_install do |installer|\n${FIX_CODE}\nend\n`;
      } else {
        // Insert our fix right after the hook opens, before any other code
        content = content.replace(HOOK_OPEN, `${HOOK_OPEN}\n${FIX_CODE}`);
      }

      fs.writeFileSync(podfilePath, content);
      return config;
    },
  ]);
};

module.exports = withVisionCameraFix;
