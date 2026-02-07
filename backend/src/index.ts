import app from './app.js';
import { startScheduler } from './lib/scheduler.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);

  // Start recurring task scheduler
  if (process.env.NODE_ENV !== 'test') {
    startScheduler();
  }
});
