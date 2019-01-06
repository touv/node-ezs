const assert = require('assert');
const fs = require('fs');
const Dir = require('path');
const from = require('from');
const ezs = require('../lib');
const Expression = require('../lib/expression').default;

ezs.use(require('./locals'));

ezs.config('stepper', {
    step: 3,
});

const Read = require('stream').Readable;
const PassThrough = require('stream').PassThrough;


class Decade extends Read {
    constructor() {
        super({ objectMode: true });
        this.i = 0;
    }
    _read() {
        this.i += 1;
        if (this.i >= 10) {
            this.push(null);
        } else {
            this.push(this.i);
        }
    }
}

describe('Build a pipeline', () => {
    it('with sync error(throw)', (done) => {
        const ten = new Decade();
        ten
            .pipe(ezs(() => {
                throw new Error('Bang!');
            }))
            .on('error', error => {
                assert.equal(error.message.split('\n')[0], 'Processing item #1 failed with Error: Bang!')
                done();
            })
            .on('data', (chunk) => {
                throw new Error('no data should be received')
            });
    });
    // https://bytearcher.com/articles/why-asynchronous-exceptions-are-uncatchable/
    it.skip('with async error(throw)', (done) => {
        const ten = new Decade();
        ten
            .pipe(ezs('badaboum'))
            .on('error', error => {
                assert.equal(error.message.split('\n')[0], 'Processing item #1 failed with Error: Badaboum!')
                done();
            })
            .on('data', (chunk) => {
                throw new Error('no data should be received')
            });
    });
    it('with error(send)', (done) => {
        const ten = new Decade();
        ten
            .pipe(ezs('boum'))
            .on('data', (chunk) => {
                assert.ok(chunk instanceof Error);
            })
            .on('end', () => {
                done();
            });
    });
    it('with async/sync error(stop)', (done) => {
        const ten = new Decade();
        ten
            .pipe(ezs('plouf'))
            .on('error', error => {
                assert.equal(error.message.split('\n')[0], 'Processing item #1 failed with Error: Plouf!')
                done();
            })
            .on('data', (chunk) => {
                throw new Error('no data should be received')
            });
    });
    it('with error in the flow (async)', (done) => {
        const ten = new Decade();
        let counter = 0;
        ten
            .pipe(ezs('plaf'))
            .on('data', (chunk) => {
                counter += chunk;
            })
            .on('error', error => {
                assert.equal(error.message.split('\n')[0], 'Processing item #7 failed with Error: Plaf!')
                assert.equal(21, counter);
                done();
            });
    });
    it('catch & ignore error', (done) => {
        let counter = 0;
        const ten = new Decade();
        ten
            .pipe(ezs('boum'))
            .pipe(ezs.catch())
            .on('data', () => {
                counter += 1;
            })
            .on('end', () => {
                assert.equal(0, counter);
                done();
            });
    });
    it('catch & get error', (done) => {
        let counter = 0;
        const ten = new Decade();
        ten
            .pipe(ezs('boum'))
            .pipe(ezs.catch((err) => {
                assert.ok(err instanceof Error);
            }))
            .on('data', () => {
                counter += 1;
            })
            .on('end', () => {
                assert.equal(0, counter);
                done();
            });
    });
    it('promise resolve', (done) => {
        let counter = 1;
        const ten = new Decade();
        ten
            .pipe(ezs('splish'))
            .on('data', () => {
                counter += 1;
            })
            .on('end', () => {
                assert.equal(10, counter);
                done();
            });
    });
    it('promise reject', (done) => {
        let counter = 1;
        const ten = new Decade();
        ten
            .pipe(ezs('splash'))
            .on('data', () => {
                counter += 1;
            })
            .on('end', () => {
                assert.equal(1, counter);
                done();
            });
    });
});
