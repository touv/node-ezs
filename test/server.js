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
    let server;
    before(() => {
        server = ezs.createServer();
    });

    after(() => {
        server.close();
    });
    /*
    it('register commands', (done) => {
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
    });
    */

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
        const options = {
            servers: [
                '127.0.0.1',
            ],
        };
        const ten = new Decade();
        ten
            .pipe(ezs((input, output) => {
                output.send(input);
                console.log('avant >>>', input);
            }))
            .pipe(ezs.dispatch(commands, options))
            .pipe(ezs((input, output) => {
                console.log('apres >>>', input);
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
