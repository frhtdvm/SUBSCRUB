const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const HTML_PATH = path.join(__dirname, 'public', 'index.html');

const server = http.createServer((req, res) => {
  try {
    const html = fs.readFileSync(HTML_PATH, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (e) {
    res.writeHead(500);
    res.end('Server error: ' + e.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`SubScrub preview server running on http://${HOST}:${PORT}`);
});
