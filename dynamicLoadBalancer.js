const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    let workers = {};
    let requestCount = 0;
    let lastChecked = new Date();

    // Function to determine if more workers are needed based on requests per second
    function needMoreWorkers() {
        const now = new Date();
        const timePassed = (now - lastChecked) / 1000; // seconds
        const requestsPerSecond = requestCount / timePassed;
        
        console.log(`Requests per second: ${requestsPerSecond.toFixed(2)}`);
        requestCount = 0; // Reset the request count after each check
        lastChecked = now;

        return requestsPerSecond > 10;  // Scale up if requests per second exceed 10
    }

    function needFewerWorkers() {
        const now = new Date();
        const timePassed = (now - lastChecked) / 1000; // seconds
        const requestsPerSecond = requestCount / timePassed;

        return requestsPerSecond < 1;  // Scale down if requests per second is less than 1
    }

    // Start with a single worker initially
    workers[cluster.fork().id] = true;
    console.log(`Current number of workers: ${Object.keys(workers).length}`);

    // Monitor the load and scale logic
    setInterval(() => {
        if (Object.keys(workers).length < numCPUs && needMoreWorkers()) {
            workers[cluster.fork().id] = true;
            console.log(`Scaled up: ${Object.keys(workers).length} workers running.`);
        } else if (Object.keys(workers).length > 1 && needFewerWorkers()) {
            // Pick a worker to kill
            const workerIds = Object.keys(workers);
            const workerToKill = workerIds[0];
            cluster.workers[workerToKill].kill();
            delete workers[workerToKill];
            console.log(`Scaled down: ${Object.keys(workers).length} workers running.`);
        }
        console.log(`Current number of workers: ${Object.keys(workers).length}`);
    }, 10000); // Check every 10 seconds

    // Listen for workers' messages
    cluster.on('message', (worker, message) => {
        if (message.cmd === 'notifyRequest') {
            requestCount++;
        }
    });

    // Handle worker exits
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        delete workers[worker.id];
        console.log(`Scaled down: ${Object.keys(workers).length} workers running.`);
    });

} else {
    // Worker processes create an HTTP server
    http.createServer((req, res) => {
        // Notify the master process of a new request
        process.send({ cmd: 'notifyRequest' });
        res.writeHead(200);
        res.end(`Response from worker ${process.pid}`);
    }).listen(8000);

    console.log(`Worker ${process.pid} started`);
}
