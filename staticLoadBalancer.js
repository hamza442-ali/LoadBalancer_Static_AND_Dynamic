const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server with http-proxy
const proxy = httpProxy.createProxyServer({});

// Configuration for two target servers
const servers = [
    { target: 'http://localhost:3001', reqCount: 0, maxReq: 10 },
    { target: 'http://localhost:3002', reqCount: 0, maxReq: 10 }
];

// Simple function to determine which server should handle the request
function getTargetServer() {
    let target = servers[0];
    if (servers[0].reqCount >= servers[0].maxReq && servers[1].reqCount < servers[1].maxReq) {
        target = servers[1];
    }
    return target;
}

// Load balancer logic
const server = http.createServer((req, res) => {
    const target = getTargetServer();
    target.reqCount++;

    console.log(`Routing request to: ${target.target}, Current load: ${target.reqCount}`);

    proxy.web(req, res, { target: target.target }, error => {
        console.error(`Could not connect to proxy: ${error}`);
    });

    // Optionally decrement request count on response end
    res.on('finish', () => {
        target.reqCount--;
    });
});

server.listen(8000, () => {
    console.log('Load balancer listening on port 8000');
});
