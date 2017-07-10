import { PassThrough, Duplex } from 'stream';
// import ezs from './index.js';

export default class Pipeline extends Duplex {
    constructor(script, options) {
        super({ ...options, objectMode: true });
        this.pump = new PassThrough({ objectMode: true });
    }

    _write(chunk, encoding, callback) {
        this.pump.write(chunk, encoding);
        callback();
    }

    _read(size) {
        const chunk = this.pump.read(size);
        this.push(chunk);
    }
}

