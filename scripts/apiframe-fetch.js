import { refreshApiframePayload } from '../lib/apiframe.js';

(async () => {
  try {
    console.log('Refreshing Apiframe payload...');
    const result = await refreshApiframePayload();
    console.log('Apiframe payload saved:', result.task_id);
  } catch (err) {
    console.error('Apiframe fetch failed:', err.message);
    process.exit(1);
  }
})();
