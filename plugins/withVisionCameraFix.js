const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const FIX_MARKER = '# Fix VisionCamera v5 / NitroModules Swift compilation on iOS 26 SDK';

// Inserted at the END of the post_install block so it runs after react_native_post_install
// and cannot be overridden by it.
const FIX_CODE = `
  ${FIX_MARKER}
  installer.pods_project.targets.each do |target|
    next unless ['VisionCamera', 'NitroModules', 'NitroImage', 'RNWorklets'].include?(target.name)
    target.build_configurations.each do |build_config|
      # Force Swift 5 language mode — avoids Swift 6 strict concurrency enforcement
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

      // Append fix code just before the last 'end' in the file.
      // In Expo-generated Podfiles, the post_install block is always last,
      // so this places our code at the end of that block — after
      // react_native_post_install() runs and cannot override our settings.
      content = content.replace(/\nend\s*$/, `\n${FIX_CODE}\nend\n`);

      fs.writeFileSync(podfilePath, content);
      return config;
    },
  ]);
};

module.exports = withVisionCameraFix;
