import _ from 'lodash';
import util from 'util';
import cbor from 'cbor';
import JSONezs from './json';

function assign(data, feed) {
    if (this.isLast()) {
        return feed.send(data);
    }
    const test = this.getParam('test', true);
    if (!test) {
        return feed.send(data);
    }
    const params = this.getParams();

    // check if missing value
    if (Array.isArray(params.path) && !Array.isArray(params.value)) {
        params.value = [params.value];
    }
    const keys = this.getParam('path', []);
    const vals = this.getParam('value', []);

    if (Array.isArray(keys)) {
        const values = _.take(vals, keys.length);
        const assets = _.zipObject(keys, values);
        Object.keys(assets).forEach((key) => {
            _.set(data, key, assets[key]);
        });
    } else {
        _.set(data, keys, vals);
    }
    return feed.send(data);
}

function replace(data, feed) {
    if (this.isLast()) {
        return feed.send(data);
    }
    const test = this.getParam('test', true);
    if (!test) {
        return feed.send(data);
    }
    const params = this.getParams();

    // check if missing value
    if (Array.isArray(params.path) && !Array.isArray(params.value)) {
        params.value = [params.value];
    }
    const keys = this.getParam('path', []);
    const vals = this.getParam('value', []);
    const obj = {};
    if (Array.isArray(keys)) {
        const values = _.take(vals, keys.length);
        const assets = _.zipObject(keys, values);
        Object.keys(assets).forEach((key) => {
            _.set(obj, key, assets[key]);
        });
    } else {
        _.set(obj, keys, vals);
    }
    return feed.send(obj);
}

function debug(data, feed) {
    if (this.isLast()) {
        return feed.send(data);
    }
    const level = this.getParam('level', 'log');
    const text = this.getParam('text', 'valueOf');
    if (typeof console[level] === 'function') {
        const logOpts = { showHidden: false, depth: 3, colors: true };
        const logFunc = console[level];
        logFunc(text.concat('#').concat(this.getIndex()).concat(' ->'), util.inspect(data, logOpts));
    }
    return feed.send(data);
}

function shift(data, feed) {
    feed.write(data);
    feed.close();
}

function extract(data, feed) {
    if (this.isLast()) {
        return feed.send(data);
    }
    let keys = this.getParam('path', []);
    if (!Array.isArray(keys)) {
        keys = [keys];
    }

    keys = keys.filter(k => typeof k === 'string');
    const values = keys.map(key => _.get(data, key)).filter(val => val);

    if (values.length === 0) {
        return feed.send(new Error('Nonexistent path.'));
    } else if (values.length === 1) {
        return feed.send(values[0]);
    }
    return feed.send(values);
}

function keep(data, feed) {
    if (this.isLast()) {
        return feed.send(data);
    }
    let keys = this.getParam('path', []);
    if (!Array.isArray(keys)) {
        keys = [keys];
    }
    const obj = {};
    keys.filter(k => typeof k === 'string').forEach(key => _.set(obj, key, _.get(data, key)));
    return feed.send(obj);
}

function concat(data, feed) {
    if (this.buffer === undefined) {
        this.buffer = '';
    }
    if (this.isLast()) {
        feed.send(this.buffer);
        return feed.close();
    }
    this.buffer = this.buffer.concat(data);
    return feed.end();
}

function accumulate(data, feed) {
    const maxsize = this.getParam('maxsize', 11);
    if (this.acc === undefined) {
        this.acc = [];
    }
    if (this.isLast()) {
        if (this.acc.length) {
            feed.send({ data: this.acc });
        }
        return feed.close();
    }
    this.acc.push(data);
    if (this.acc.length >= maxsize) {
        feed.write({ data: _.clone(this.acc) });
        this.acc = [];
    }
    return feed.end();
}

function dissipate(data, feed) {
    if (this.isLast()) {
        return feed.send(data);
    }
    if (Array.isArray(data.data)) {
        data.data.forEach(item => feed.write(item));
    }
    return feed.end();
}

function json(data, feed) {
    if (this.isLast()) {
        return feed.send(data);
    }
    return feed.send(JSON.parse(data));
}

function jsonezs(data, feed) {
    if (this.isLast()) {
        return feed.send(data);
    }
    return feed.send(JSONezs.parse(data));
}

function encoder(data, feed) {
    if (this.isLast()) {
        return feed.close();
    }
    return feed.send(cbor.encode(data));
}

export default {
    extract,
    assign,
    replace,
    shift,
    keep,
    debug,
    concat,
    accumulate,
    dissipate,
    json,
    jsonezs,
    encoder,
};
