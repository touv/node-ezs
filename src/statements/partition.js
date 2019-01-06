import { NSHARDS } from '../constants';

/**
 * Take all `chunk`, and throw array of chunks
 *
 * @param {Number} [size] Size of each partition
 * @returns {String}
 */
export default function partition(data, feed) {
    const size = Number(this.getParam('size')) || NSHARDS;

    if (this.buffer === undefined) {
        this.buffer = [];
    }
    if (this.isLast()) {
        if (this.buffer.length > 0) {
            feed.write(Array.from(this.buffer));
        }
        return feed.close();
    }
    this.buffer.push(data);
    if (this.buffer.length >= size) {
        feed.send(Array.from(this.buffer));
        this.buffer = [];
    } else {
        feed.end();
    }
}
