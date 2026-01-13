// Example: Post bot stats — `serverCount` will be normalized to `guildCount`.
const { LabsApiClient } = require('../dist/index');

(async () => {
  const client = new LabsApiClient({ apiKey: process.env.LABS_API_KEY || 'sk_example' });
  try {
    const res = await client.postStats({ botId: '1234567890', serverCount: 42, userCount: 1200, uptime: 3600 });
    console.log('Posted stats, server-side response:', res.data);
  } catch (err) {
    console.error('Error posting stats:', err.message || err);
  }
})();
