import assert from 'assert';
import { PassThrough, Duplex } from 'stream';

export default class Pipeline extends Duplex {
    constructor(ezs, commands, options) {
        super({ ...options, objectMode: true });
        this.tubin = new PassThrough({ objectMode: true });
        this.tubout = this.tubin;
        assert(Array.isArray(commands), 'Pipeline works with an array of commands.');
        const cmds = [...commands];
        cmds.push({
            mode: 'normal',
            name: 'transit',
            args: { },
        });
        this.tubout = cmds.reduce(ezs.command, this.tubout);

        this.on('finish', () => {
            this.tubin.end();
        });
        this.tubout.on('data', (chunk, encoding) => {
            this.push(chunk, encoding);
        });
        this.tubout.on('finish', () => {
            this.push(null);
        });
        this.tubin.on('error', (e) => {
            console.error('Unlikely error on the Pipeline', e);
        });
        this.tubout.pause();
    }

    _write(chunk, encoding, callback) {
        this.tubin.write(chunk, encoding, callback);
    }

    _read(size) {
        this.lastSize = size;
        if (this.tubout.isPaused()) {
            this.tubout.resume();
        }
    }

}
