const { LabsApiClient } = require('../dist/index');

(async () => {
  const client = new LabsApiClient({ telemetry: { enabled: false }, timeout: 10000 });
  try {
    const res = await client.get('/bots', { limit: 3, sort: '-votes' });
    console.log(res.data);
  } catch (err) {
    console.error('Request failed:', err.message || err);
  }
})();
