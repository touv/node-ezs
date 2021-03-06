const eol = '\n';
/**
 * Take `String` and throw `Object` builded by JSON.parse on each line
 *
 * @returns {String}
 */
export default function unpack(data, feed) {
    if (this.isLast()) {
        if (this.remainder) {
            feed.write(JSON.parse(this.remainder));
        }
        return feed.close();
    }
    this.remainder = this.remainder || '';

    let lines;
    if (Buffer.isBuffer(data)) {
        lines = data.toString().split(eol);
    } else if (typeof data === 'string') {
        lines = data.split(eol);
    } else {
        lines = [];
    }
    if (this.remainder) {
        lines.unshift(this.remainder + lines.shift());
    }
    this.remainder = lines.pop();
    lines.forEach((line) => {
        feed.write(JSON.parse(line));
    });
    return feed.end();
}
