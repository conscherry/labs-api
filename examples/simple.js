const { LabsApiClient } = require('../dist/index');

(async () => {
  const client = new LabsApiClient({ telemetry: { enabled: false } });
  try {
    const website = await client.getWebsiteStats();
    console.log('Website stats:', website.data);
  } catch (err) {
    console.error('Error fetching website stats:', err.message || err);
  }
})();
