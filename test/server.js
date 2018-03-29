const assert = require('assert');
const fs = require('fs');
const Dir = require('path');
const ezs = require('../lib');


ezs.use(require('./locals'));

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

describe('through a server', () => {
    let server;
    before(() => {
        // runs before all tests in this block
        server = ezs.createServer();
    });

    after(() => {
        // runs after all tests in this block
        server.close();
    });

    it('with no transformation', (done) => {
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
        const targets = {
            servers: [
                {
                    host: 'localhost',
                    port: 141176,
                },
            ],
        };
        const ten = new Decade();
        ten
            .pipe(ezs((input, output) => {
                output.send(input);
            }))
            .pipe(ezs.delegate(commands, targets))
            .pipe(ezs((input, output) => {
                output.send(input);
            }))
            .on('data', (chunk) => {
                res += chunk;
            })
            .on('end', () => {
                assert.strictEqual(res, 45);
                done();
            });
    });

    /**/
});
