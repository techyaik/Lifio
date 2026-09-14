const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to inject Google Health Connect package visibility (<queries>)
 * into AndroidManifest.xml for Expo Managed Workflow (CNG).
 */
module.exports = function withHealthConnectQueries(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    if (!androidManifest.queries) {
      androidManifest.queries = [];
    }

    const queries = androidManifest.queries;
    const hasHealthPackage = queries.some((q) =>
      q.package?.some((p) => p.$['android:name'] === 'com.google.android.apps.healthdata')
    );

    if (!hasHealthPackage) {
      queries.push({
        package: [{ $: { 'android:name': 'com.google.android.apps.healthdata' } }],
        intent: [
          {
            action: [{ $: { 'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE' } }],
          },
        ],
      });
    }

    return config;
  });
};
