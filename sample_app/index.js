const http = require('http');
const pkg = require('./package.json');
const PORT = process.env.PORT || 8555;
const server = http.createServer((req, res) => {
  res.writeHead(200, {'content-type': 'text/plain'});
  res.end(`hello world from ${pkg.name}, environment is "${process.env.NODE_ENV}"`);
});
server.listen(PORT);
console.log(`Server listening on port ${PORT}`);

