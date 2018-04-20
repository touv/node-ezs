import assert from 'assert';
import os from 'os';
import crypto from 'crypto';
import cbor from 'cbor';
import cluster from 'cluster';
import http from 'http';

const numCPUs = os.cpus().length;
const decoder = new cbor.Decoder();
const pipelines = {};

function encoder(data, feed) {
    if (this.isLast()) {
        return feed.close();
    }
    return feed.send(cbor.encode(data));
}

function register(data, feed) {
    if (this.isLast()) {
        return feed.close();
    }
    const shasum = crypto.createHash('sha1');
    shasum.update(data.toString());
    const cmdid = shasum.digest('hex');
    pipelines[cmdid] = data;
    return feed.send(JSON.stringify({
        id: cmdid,
        concurrency: numCPUs,
    }));
}

function createServer(ezs) {
    return http.createServer((request, response) => {
        const { url, method } = request;
        const cmdid = url.slice(1);
        console.log('serve get', cmdid, pipelines[cmdid], register);
        if (url === '/' && method === 'POST') {
            request
                .pipe(ezs('concat'))
                .pipe(ezs(register))
                .pipe(response);
        } else if (url.match(/^\/[a-f0-9]{40}$/i)
            && method === 'POST'
            && pipelines[cmdid]
        ) {
            response.writeHead(200);
            request
                .pipe(decoder)
                .pipe(ezs('debug', { text: 'XXX' }))
                .pipe(ezs.pipeline(pipelines[cmdid]))
                .pipe(ezs(encoder))
                .pipe(response);
        } else {
            response.writeHead(204);
            response.end();
        }
    }).listen(31976);
}

function createCluster(ezs, options) {
    if (cluster.isMaster) {
        console.log(`Master ${process.pid} is running`);
        for (let i = 0; i < numCPUs; i += 1) {
            cluster.fork();
        }

        /*
        cluster.on('exit', (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died`);
        });
        */
    } else {
        createServer(ezs, options);
        console.log(`Worker ${process.pid} started`);
    }
    return cluster;
}

export default {
    createServer,
    createCluster,
};
