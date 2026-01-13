// Example: Enable telemetry with custom SDK metadata
const { LabsApiClient } = require('../dist/index');

(async () => {
  const client = new LabsApiClient({ telemetry: { enabled: true, sdkName: 'conscherry-labs-sdk', sdkVersion: '1.0.2', includePlatform: true } });
  try {
    const bots = await client.listBots({ limit: 5 });
    console.log('Retrieved bots (telemetry headers sent):', bots.data?.map(b => b.name));
  } catch (err) {
    console.error('Error listing bots:', err.message || err);
  }
})();
