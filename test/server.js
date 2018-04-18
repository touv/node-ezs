const assert = require('assert');
const http = require('http');
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
        // runs before all tests in this block
        server = ezs.createServer();
    });

    after(() => {
        // runs after all tests in this block
        server.close();
    });

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
        const requestBody = JSON.stringify(commands);
        const requestOptions = {
            hostname: '127.0.0.1',
            port: 31976,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': requestBody.length,
            },
        };

        http.request(requestOptions, (res) => {
            let requestResponse = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                requestResponse += chunk;
            });
            res.on('end', () => {
                const result = JSON.parse(requestResponse);
                assert.equal(result.id, '4f54045b1980048ea929d3379fb425cace53238d');
                done();
            });
        }).write(requestBody);
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
        const options = {
            servers: [
                {
                    host: 'localhost',
                    port: 31976,
                },
            ],
        };
        const ten = new Decade();
        ten
            .pipe(ezs((input, output) => {
                output.send(input);
            }))
            .pipe(ezs.dispatch(commands, options))
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
