import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import cbor from 'cbor';
 
const dirname = os.tmpdir();

const decoder = new cbor.Decoder();

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
    const filename = shasum.digest('hex');
    const filepath = path.resolve(dirname, filename);
    fs.writeFile(filepath, data, (err) => {
        if (err) {
            return feed.send(err);
        }
        return feed.send(JSON.stringify({
            id: filename,
            concurrency: os.cpus().length,
        }));
    });
    return null;
}

function createServer(ezs, options) {
    const opts = options || {};
    const port = !isNaN(opts.port) ? opts.port : 31976;
    return http.createServer((request, response) => {
        const { url, method, headers } = request;
        const filepath = path.resolve(dirname, '.', url);

        if (url === '/' && method === 'POST') {
            request
                .pipe(ezs('concat'))
                .pipe(ezs(register))
                .pipe(response);
        } else if (url.match(/^\/[a-f0-9]{40}$/i) && method === 'PUT') {
            fs.stat(filepath, (err, stats) => {
                if (err || !stats.isFile()) {
                    response.writeHead(404);
                }

                response.writeHead(200);
                request
                    .pipe(decoder)
                    .pipe(ezs.fromFile(filepath))
                    /*
                    .pipe(ezs.catch((err) => {
                        console.err(err);
                    })*/
                    .pipe(ezs(encoder))
                    .pipe(response);

                /*
                    const stream1 = request.pipe(ezs.fromString(script));
                    const stream2 = stream1;
                    stream2.on('end', () => {
                        process.exit(1);
                    });
                stream2.pipe(process.stdout);
                */
            });
        } else {
            response.writeHead(204);
            response.end();
        }
    }).listen(port);
}

export default {
    createServer,
};
