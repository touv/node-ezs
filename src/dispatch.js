import { PassThrough, Duplex } from 'stream';
import assert from 'assert';
import pMap from 'p-map';
import MultiStream from 'multistream';
import { DEBUG, NSHARDS } from './constants';
import { registerCommands, inspectServers, connectServer } from './protocol';

export default class Dispatch extends Duplex {
    constructor(ezs, commands, servers, environment) {
        super(ezs.objectMode());

        this.handles = [];

        this.tubin = new PassThrough(ezs.objectMode());
        this.tubout = this.tubin
            .pipe(ezs('transit'));
        this.on('finish', () => {
            this.handles.forEach(handle => handle[0].end());
        });
        this.tubout.on('data', (chunk, encoding) => {
            if (!this.push(chunk, encoding)) {
                this.tubout.pause();
            }
        });
        this.tubout.on('end', () => {
            this.push(null);
        });
        this.tubout.on('error', (e) => {
            DEBUG('Unlikely error', e);
        });
        this.tubout.pause();

        assert(Array.isArray(commands), 'commands should be an array.');
        assert(Array.isArray(servers), 'servers should be an array.');

        const ns = Number(ezs.settings.nShards) || NSHARDS;

        this.servers = inspectServers(servers, ns);
        this.commands = commands;
        this.semaphore = true;
        this.lastIndex = 0;
        this.ezs = ezs;
        this.environment = environment || {};
    }

    _write(chunk, encoding, callback) {
        if (this.semaphore) {
            this.semaphore = false;
            pMap(this.servers, server => registerCommands(this.ezs, server, this.commands).catch((e) => {
                DEBUG(`Unable to regsister commands with the server: ${server}`, e);
            })).then((workers) => {
                this.handles = workers.map(connectServer(this.ezs, this.environment, (e) => {
                    this.emit('error', e);
                }));
                const streams = this.handles.map(h => h[1]);
                MultiStream(streams, this.ezs.objectMode()).pipe(this.tubin);
                this.balance(chunk, encoding, callback);
            }, callback)
                .catch((e) => {
                    DEBUG('Unable to gathering streams', e);
                });
        } else {
            this.balance(chunk, encoding, callback);
        }
    }

    _read(size) {
        this.lastSize = size;
        if (this.tubout.isPaused()) {
            this.tubout.resume();
        }
    }

    _destroy(err, cb) {
        this.tubout.destroy();
        cb(err);
    }

    balance(chunk, encoding, callback) {
        this.lastIndex += 1;
        if (this.lastIndex >= this.handles.length) {
            this.lastIndex = 0;
        }
        this.handles[this.lastIndex][0].write(
            chunk,
            encoding,
            callback,
        );
    }
}
