import { app } from './app.js';

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${PORT} (use your machine's LAN IP from phone, e.g. http://192.168.x.x:${PORT})`);
});
