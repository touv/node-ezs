import lodash from 'lodash';

function assignement(data, feed) {
    if (this.isLast()) {
        return feed.send(data);
    }
    Object.keys(this.getParams()).forEach((key) => {
        lodash.set(data, key, this.getParam(key));
    });
    return feed.send(data);
}

export default {
    assignement,
};
