import { PassThrough, Duplex } from 'stream';
import assert from 'assert';
import http from 'http';
import pMap from 'p-map';
import cbor from 'cbor';
import mergeStream from 'merge-stream';
import config from './config';

const parseAddress = (srvr) => {
    if (typeof srvr !== 'string') {
        return null;
    }
    const hostWithPort = srvr.match(/^\[?([^\]]+)\]?:(\d+)$/);
    if (hostWithPort) {
        return {
            hostname: hostWithPort[1],
            port: Number(hostWithPort[2]),
        };
    }
    return {
        hostname: srvr,
        port: Number(config.port),
    };
};

const registerTo = ({ hostname, port }, commands) =>
    new Promise((resolve, reject) => {
        const requestBody = JSON.stringify(commands);
        const requestOptions = {
            hostname,
            port,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': requestBody.length,
            },
        };
        http
            .request(requestOptions, (res) => {
                let requestResponse = '';
                res.setEncoding('utf8');
                res.on('error', error => reject(error));
                res.on('data', (chunk) => {
                    requestResponse += chunk;
                });
                res.on('end', () => {
                    try {
                        const result = JSON.parse(requestResponse);
                        console.log(
                            `Register ${hostname}:${port} with ${result}.`,
                        );
                        resolve({
                            hostname,
                            port,
                            path: `/${result}`,
                            method: 'POST',
                            headers: {
                                'Transfer-Encoding': 'chunked',
                                'Content-Type': ' application/cbor',
                            },
                        });
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .write(requestBody);
    });

const connectTo = (serverOptions, funnel) =>
    new Promise((resolve, reject) => {
        const handle = http.request(serverOptions, (res) => {
            if (res.statusCode === 200) {
                funnel.add(res);
            } else {
                funnel.emit(
                    'error',
                    new Error(
                        `${serverOptions.hostname}:${
                            serverOptions.port
                        } return ${res.statusCode}`,
                    ),
                );
            }
        });
        if (handle) {
            const input = new PassThrough({ objectMode: true });
            input
                .pipe(handle);
            resolve(input);
        } else {
            reject(new Error('Unable to connect to server'));
        }
    });

export default class Dispatch extends Duplex {
    constructor(ezs, commands, servers) {
        super({ objectMode: true });
        const decoder = new cbor.Decoder();

        this.handles = [];

        this.tubin = new PassThrough({ objectMode: true });
        this.tubout = this.tubin.pipe(decoder);

        this.on('finish', () => {
            this.handles.forEach(handle => handle.end());
        });
        this.tubout.on('data', (chunk, encoding) => {
            this.push(chunk, encoding);
        });
        this.tubout.on('finish', () => {
            this.push(null);
        });
        this.tubout.on('error', (e) => {
            console.error('Unlikely error', e);
        });
        this.tubout.pause();

        assert(Array.isArray(commands), 'commands should be an array.');
        assert(Array.isArray(servers), 'servers should be an array.');

        this.servers = servers.map(parseAddress).filter(x => x);
        this.commands = commands;
        this.semaphore = true;
        this.lastIndex = 0;
        this.funnel = mergeStream();
        this.funnel.pipe(this.tubin);
    }

    _write(chunk, encoding, callback) {
        const self = this;
        if (self.semaphore) {
            self.semaphore = false;
            pMap(self.servers, server =>
                registerTo(server, self.commands),
            ).then((workers) => {
                pMap(workers, worker => connectTo(worker, self.funnel)).then(
                    (handles) => {
                        self.handles = handles;
                        self.balance(chunk, encoding, callback);
                    },
                );
            });
        } else {
            self.balance(chunk, encoding, callback);
        }
    }

    _read(size) {
        this.lastSize = size;
        if (this.tubout.isPaused()) {
            this.tubout.resume();
        }
    }

    balance(chunk, encoding, callback) {
        this.lastIndex += 1;
        if (this.lastIndex >= this.handles.length) {
            this.lastIndex = 0;
        }
        this.handles[this.lastIndex].write(
            cbor.encode(chunk),
            encoding,
            callback,
        );
    }
}
