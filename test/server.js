const assert = require('assert');
const ezs = require('../lib');

ezs.use(require('./locals'));

const Read = require('stream').Readable;

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

describe('through a server', () => {
    const server = ezs.createServer();

    after(() => {
        server.close();
    });

    it('with simple pipeline', (done) => {
        let res = 0;
        const commands = [
            {
                name: 'increment',
                args: {
                    step: 2,
                },
            },
            {
                name: 'decrement',
                args: {
                    step: 2,
                },
            },
        ];
        const servers = [
            '127.0.0.1',
        ];
        const ten = new Decade();
        ten
            .pipe(ezs.dispatch(commands, servers))
            .on('data', (chunk) => {
                res += chunk;
            })
            .on('end', () => {
                assert.strictEqual(res, 45);
                done();
            });
    });

    it('with second pipeline with different parameter', (done) => {
        let res = 0;
        const commands = [
            {
                name: 'increment',
                args: {
                    step: 3,
                },
            },
            {
                name: 'decrement',
                args: {
                    step: 2,
                },
            },
        ];
        const servers = [
            '127.0.0.1',
        ];
        const ten = new Decade();
        ten
            .pipe(ezs.dispatch(commands, servers))
            .on('data', (chunk) => {
                res += chunk;
            })
            .on('end', () => {
                assert.strictEqual(res, 54);
                done();
            });
    });

    it('with buggy pipeline', (done) => {
        let res = 0;
        const commands = [
            {
                name: 'increment',
                args: {
                    step: 2,
                },
            },
            {
                name: 'boum',
                args: {
                    step: 2,
                },
            },
        ];
        const servers = [
            '127.0.0.1',
        ];
        const ten = new Decade();
        ten
            .pipe(ezs.dispatch(commands, servers))
            .on('data', (chunk) => {
                res += chunk;
            })
            .on('end', () => {
                assert.strictEqual(res, 0);
                done();
            });
    });

    it('with unknowed command in the pipeline', (done) => {
        let res = 0;
        const commands = [
            {
                name: 'increment',
                args: {
                    step: 2,
                },
            },
            {
                name: 'turlututu',
                args: {
                    step: 2,
                },
            },
        ];
        const servers = [
            '127.0.0.1',
        ];
        const ten = new Decade();
        ten
            .pipe(ezs.dispatch(commands, servers))
            .on('data', (chunk) => {
                res += chunk;
            })
            .on('end', () => {
                assert.strictEqual(res, 0);
                done();
            });
    });

    /**/
});
