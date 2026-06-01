const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

const SECRET = 'bf4df7dd7545f0bd88416db34facdb6d913232932ef08b2004ef59b010bdf667';
const PORT = 9000;

function verifySignature(payload, signature) {
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(payload);
    const digest = 'sha256=' + hmac.digest('hex');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function runDeploy() {
    console.log(`[${new Date().toISOString()}] Deploy triggered`);
    exec('bash /opt/touchgrass/deploy.sh', (err, stdout, stderr) => {
        if (err) {
            console.error(`Deploy FAILED: ${err.message}`);
            console.error(stderr);
        } else {
            console.log(`Deploy OK`);
            console.log(stdout);
        }
    });
}

const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/webhook') {
        res.writeHead(404);
        return res.end('not found');
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        const signature = req.headers['x-hub-signature-256'] || '';

        if (!verifySignature(body, signature)) {
            console.log(`[${new Date().toISOString()}] Invalid signature from ${req.socket.remoteAddress}`);
            res.writeHead(403);
            return res.end('invalid signature');
        }

        try {
            const payload = JSON.parse(body);
            const branch = payload.ref || '';
            if (branch === 'refs/heads/main') {
                res.writeHead(200);
                res.end('deploy started');
                // Run async so we respond quickly to GitHub
                setImmediate(() => runDeploy());
            } else {
                console.log(`[${new Date().toISOString()}] Ignored push to ${branch}`);
                res.writeHead(200);
                res.end('ignored - not main branch');
            }
        } catch (e) {
            console.error(`Parse error: ${e.message}`);
            res.writeHead(400);
            res.end('bad request');
        }
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Webhook listener on 127.0.0.1:${PORT}`);
});
