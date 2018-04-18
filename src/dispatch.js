import { PassThrough, Duplex } from 'stream';
import assert from 'assert';
import http from 'http';
import fetch from 'node-fetch';
import pMap from 'p-map';

const target2servers = (servers) => {
    return [
        {
            hostname: '127.0.0.1',
            port: 31976,
        },
    ];
};

const registerTo = ({ hostname, port }, commands) =>
    new Promise((resolve, reject) =>
        fetch(`http://${hostname}:${port}`, {
            method: 'POST',
            body: JSON.stringify(commands),
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(res => res.json())
        .then(({ id }) => resolve({
            hostname,
            port,
            path: `/${id}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }))
        .catch(err => reject(err)));

const connectTo = tubout => serversOptions =>
    new Promise(resolve => resolve(serversOptions.map(
            serverOptions =>
            http.request(serverOptions,
                res => res.pipe(tubout)),
        )));

export default class Dispatch extends Duplex {
    constructor(ezs, commands, options) {
        super({ ...options, objectMode: true });

        this.handles = [];
        this.tubout = new PassThrough({ objectMode: true });
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


        assert.equal(typeof options, 'object', 'options should be a object.');
        assert(Array.isArray(options.servers), 'options.servers should be an array.');

        this.servers = target2servers(options.servers);
        this.commands = commands;
        this.semaphore = true;
        this.lastIndex = 0;
    }

    _write(chunk, encoding, callback) {
        const self = this;
        if (self.semaphore) {
            self.semaphore = false;
            pMap(self.servers, server => registerTo(server, self.commands))
                .then(connectTo(self.tubout))
                .then((handles) => {
                    self.handles = handles;
                    self.balance(chunk, encoding, callback);
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
        this.handles[this.lastIndex].write(chunk, encoding, callback);
    }

}
