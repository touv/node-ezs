import fs from 'fs';
import tmpFilepath from 'tmp-filepath';
import LRU from 'lru-cache';
import { PassThrough } from 'stream';
import { DEBUG } from './constants';

const deleteFile = (key, fileName) => {
    fs.unlink(fileName, (err) => {
        if (err) {
            DEBUG('Unable to delete file from the cache', err);
        }
    });
};

export default class Cache {
    constructor(ezs, opts) {
        const options = opts || {};
        const cacheOptions = {
            max: 500,
            maxAge: 1000 * 60 * 60,
            ...options,
        };
        cacheOptions.dispose = deleteFile;
        this.handle = LRU(cacheOptions);
        this.ezs = ezs;
        this.objectMode = options.objectMode || false;
    }

    get(key) {
        const { ezs } = this;
        const cache = this.handle;
        const cacheFile = cache.get(key);
        if (cacheFile) {
            if (this.objectMode) {
                return ezs
                    .load(cacheFile, { nShards: 1 });
            }
            return fs.createReadStream(cacheFile)
                .pipe(ezs.uncompress());
        }
        return null;
    }

    set(key) {
        const { ezs } = this;
        const cache = this.handle;
        const tmpFile = tmpFilepath('.bin');
        const streamOptions = this.objectMode ? ezs.objectMode() : ezs.bytesMode();
        const cacheInput = new PassThrough(streamOptions);
        let cacheOutput;
        if (this.objectMode) {
            cacheOutput = cacheInput
                .pipe(ezs.save(tmpFile, { nShards: 1 }));
        } else {
            cacheOutput = cacheInput
                .pipe(ezs.compress())
                .pipe(fs.createWriteStream(tmpFile));
        }
        const cachePromise = new Promise((resolve, reject) => cacheOutput.on('error', reject).on('finish', resolve));

        const func = (data, feed) => {
            if (data) {
                cacheInput.write(data, () => {
                    feed.send(data);
                });
            } else {
                cacheInput.end(() => {
                    cachePromise.then(() => {
                        cache.set(key, tmpFile);
                        feed.close();
                    });
                });
                cacheInput.destroy();
            }
        };
        const stream = new PassThrough(streamOptions);
        return stream.pipe(ezs(func));
    }
}
