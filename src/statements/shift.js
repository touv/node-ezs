/**
 * Take the first `Object` and close the feed
 *
 * @returns {Object}
 */
export default function shift(data, feed) {
    feed.send(data);
    feed.close();
}


