import assert from 'assert';
import { Transform } from 'stream';
import Engine from './engine';


const isStatement = name => typeof name === 'function';

const ezs = (name, opts) => {
    if (isStatement(name)) {
        return new Engine(name, opts);
    }
    if (typeof name === 'string' && ezs.plugins[name]) {
        return new Engine(ezs.plugins[name], opts);
    }
    throw new Error(`'${name}'  unknown`);
};

ezs.plugins = {};
ezs.use = (module) => {
    assert.equal(typeof module, 'object');
    Object.keys(module).forEach((moduleName) => {
        if (isStatement(module[moduleName])) {
            ezs.plugins[moduleName] = module[moduleName];
        } else {
            throw new Error(`${moduleName} is not loaded. It's not a valid statement`);
        }
    });
    return ezs;
};

ezs.tag = (tagname, func) => {
    assert.equal(typeof tagname, 'string');
    assert.equal(typeof func, 'function');
    return new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            if (func(chunk)) {
                chunk.tagName = () => tagname;
            }
            callback(null, chunk);
        },
    });
};

ezs.has = (tagname, name, opts) => {
    if (isStatement(name)) {
        return new Engine(name, opts, tagname);
    }
    if (typeof name === 'string' && ezs.plugins[name]) {
        return new Engine(ezs.plugins[name], opts, tagname);
    }
    throw new Error(`${name} is  unknown`);
};

module.exports = ezs;

