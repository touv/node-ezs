import os from 'os';
import crypto from 'crypto';
import cbor from 'cbor';
import cluster from 'cluster';
import http from 'http';

const numCPUs = os.cpus().length;

function encoder(data, feed) {
    if (this.isLast()) {
        return feed.close();
    }
    return feed.send(cbor.encode(data));
}

function register(store) {
    function registerCommand(data, feed) {
        if (this.isLast()) {
            return feed.close();
        }
        const shasum = crypto.createHash('sha1');
        shasum.update(data.toString());
        const cmdid = shasum.digest('hex');
        return store.set(cmdid, data).then(() => feed.send(JSON.stringify(cmdid)));
    }
    return registerCommand;
}

function createServer(ezs, store) {
    const server = http.createServer((request, response) => {
        const { url, method } = request;
        const cmdid = url.slice(1);
        if (url === '/' && method === 'POST') {
            request
                .pipe(ezs('concat'))
                .pipe(ezs(register(store)))
                .pipe(response);
        } else if (url.match(/^\/[a-f0-9]{40}$/i)
            && method === 'POST'
        ) {
            const decoder = new cbor.Decoder();
            response.writeHead(200);
            store.get(cmdid)
                .then((commands) => {
                    request
                        .pipe(decoder)
                        .pipe(ezs('debug', { text: 'Server receive (decoded)' }))
                        .pipe(ezs.pipeline(commands))
                        .pipe(ezs('debug', { text: 'Server generate (decoded)' }))
                        .pipe(ezs(encoder))
                        .pipe(ezs('debug', { text: 'Server generate (encoded)' }))
                        .pipe(response);
                });
        } else {
            response.writeHead(404);
            response.end();
        }
    }).listen(31976);
    // console.log(`PID ${process.pid} listening on 31976`);
    return server;
}

function createCluster(ezs, store) {
    if (cluster.isMaster) {
        for (let i = 0; i < numCPUs; i += 1) {
            cluster.fork();
        }

        /*
        cluster.on('exit', (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died`);
        });
        */
    } else {
        createServer(ezs, store);
    }
    return cluster;
}

export default {
    createServer,
    createCluster,
};
