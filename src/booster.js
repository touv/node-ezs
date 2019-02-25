import os from 'os';
import LRU from 'keyv-lru-files';
import { Duplex, PassThrough } from 'stream';
import hasher from 'node-object-hash';

const hashCoerce = hasher({
    sort: false,
    coerce: true,
});

const cache = new LRU({
    files: 100,
    size: '1 GB',
    check: 10,
});
cache.opts.dir = os.tmpdir();

class Booster extends Duplex {
    constructor(ezs, commands, environment) {
        super(ezs.objectMode());
        this.ezs = ezs;
        this.commandsHash = hashCoerce.hash(commands);
        this.environmentHash = hashCoerce.hash(environment);
        this.pipeline = ezs.pipeline(commands, environment);
        this.firstWrite = true;
        this.firstRead = true;
        this.isCached = false;

        this.cacheInput = new PassThrough(ezs.objectMode());
        this.cacheOutput = this.cacheInput
            .pipe(ezs('group'))
            .pipe(ezs('pack'))
            .pipe(ezs.compress(ezs.encodingMode()));
    }

    _write(chunk, encoding, callback) {
        const { ezs } = this;
        if (this.firstWrite) {
            this.firstWrite = false;
            let ignoreChunk = true;
            const firstChunkHash = hashCoerce.hash(chunk);
            const uniqHash = hashCoerce.hash([this.commandsHash, this.environmentHash, firstChunkHash]);
            return cache.has(uniqHash)
                .then((cached) => {
                    this.isCached = cached;
                    if (cached) {
                        return cache.stream(uniqHash);
                    }
                    cache.set(uniqHash, this.cacheOutput); // TODO catch Error ...
                    return Promise.resolve();
                })
                .then(stream => new Promise((resolve) => {
                    if (stream) {
                        return resolve(stream
                            .pipe(ezs.uncompress(ezs.encodingMode()))
                            .pipe(ezs('unpack'))
                            .pipe(ezs('ungroup'))
                            .pipe(ezs((data, feed) => {
                                if (data !== null) {
                                    if (!this.push(data)) {
                                        stream.pause();
                                    }
                                } else {
                                    this.push(null);
                                }
                                feed.send(data);
                            }))
                            .pipe(ezs('transit'))
                            .on('error', err => this.emit(err)));
                    }
                    ignoreChunk = false;
                    return resolve(this.pipeline
                        .pipe(ezs((data, feed) => {
                            if (data !== null) {
                                this.cacheInput.write(data);
                            } else {
                                this.cacheInput.end();
                            }
                            feed.send(data);
                        }))
                        .pipe(ezs((data, feed) => {
                            if (data !== null) {
                                if (!this.push(data)) {
                                    stream.pause();
                                }
                            } else {
                                this.push(null);
                            }
                            feed.send(data);
                        })));
                }))
                .then((output) => {
                    this.output = output;
                    if (this.firstRead) {
                        this.output.pause();
                    }
                    if (!ignoreChunk) {
                        this.pipeline.write(chunk, encoding);
                    }
                    return callback();
                });
        }
        if (this.isCached) {
            return callback();
        }
        return this.pipeline.write(chunk, encoding, callback);
    }

    _read() {
        if (this.firstRead) {
            this.firstRead = false;
        }
        if (this.output) {
            this.output.resume();
        }
    }

    _final(callback) {
        this.pipeline.end(callback);
    }
}

const booster = (ezs, pipeline) => new Booster(ezs, pipeline);

export default booster;
