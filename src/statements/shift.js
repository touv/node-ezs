/**
 * Take the first `Object` and close the feed
 *
 * @returns {Object}
 */
export default function shift(data, feed) {
    if (this.isFirst()) {
        feed.send(data);
    } else if (this.isLast()) {
        feed.close();
    } else {
        feed.end();
    }

}


