const http = require('http');

const data = JSON.stringify({ niche: 'AI in Finance' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log("Response:", body);
    const queryId = JSON.parse(body).queryId;
    if (queryId) {
      poll(queryId);
    }
  });
});

req.write(data);
req.end();

function poll(queryId) {
  setTimeout(() => {
    http.get(`http://localhost:3000/api/status/${queryId}`, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        const json = JSON.parse(body);
        console.log("Status:", json.status);
        if (json.status === 'processing' || json.status === 'pending') {
          poll(queryId);
        } else {
            http.get(`http://localhost:3000/api/dashboard/AI%20in%20Finance`, (r) => {
              let b = '';
              r.on('data', d => b += d);
              r.on('end', () => console.log("Dashboard:", b));
            });
        }
      });
    });
  }, 2000);
}
