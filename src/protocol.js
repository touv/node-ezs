import { PassThrough } from 'stream';
import http from 'http';
import Parameter from './parameter';
import { DEBUG, PORT, NSHARDS } from './constants';

export const parseAddress = (srvr) => {
    if (typeof srvr !== 'string') {
        return null;
    }
    const hostWithPort = srvr.match(/^\[?([^\]]+)\]?:(\d+)$/);
    if (hostWithPort) {
        return {
            hostname: hostWithPort[1],
            port: Number(hostWithPort[2]),
        };
    }
    return {
        hostname: srvr,
        port: Number(PORT),
    };
};

export const agent = new http.Agent({
    maxSockets: 0,
    keepAlive: false,
    timeout: 0,
});

export const ensureArray = a => (Array.isArray(a) ? a : [a]);

export const inspectServers = (servers, ns = NSHARDS) => ensureArray(servers)
    .filter(Boolean)
    .filter((elem, pos, arr) => arr.indexOf(elem) === pos)
    .map(parseAddress)
    .map(s => Array(ns).fill(s)) // multiple each line
    .reduce((a, b) => a.concat(b), []); // flatten all

export const registerCommands = (ezs, { hostname, port }, commands, environment = {}) => new Promise(
    (resolve, reject) => {
        if (!Array.isArray(commands) || commands.length === 0) {
            return reject(new Error('No valid commands array'));
        }
        const serverOptions = {
            hostname,
            port,
            path: '/',
            method: 'POST',
            headers: {
                'Transfer-Encoding': 'chunked',
                'Content-Type': ' application/json',
            },
            agent,
        };
        commands.forEach((command, index) => {
            serverOptions.headers[`X-Command-${index}`] = Parameter.encode(JSON.stringify(command));
        });
        Object.keys(environment).forEach((keyEnv) => {
            serverOptions.headers[`X-Environment-${keyEnv}`] = Parameter.encode(JSON.stringify(environment[keyEnv]));
        });
        return resolve(serverOptions);
    },
);

export const connectServer = ezs => (serverOptions, index) => {
    const opts = {
        ...serverOptions,
        timeout: 0,
    };
    const { hostname, port } = opts;
    const input = new PassThrough(ezs.objectMode());
    const output = new PassThrough(ezs.objectMode());
    const handle = http.request(opts, (res) => {
        DEBUG(`http://${hostname}:${port} send code ${res.statusCode}`);
        if (res.statusCode === 200) {
            res
                .pipe(ezs.uncompress())
                .pipe(ezs('unpack'))
                .pipe(ezs('ungroup'))
                .pipe(output);
            return 1;
        }
        if (res.statusCode === 400) {
            const errmsg = Parameter.decode(res.headers['x-error']);
            output.write(new Error(`Server sent: ${errmsg}`));
            output.end();
            return 2;
        }
        output.write(new Error(
            `http://${hostname}:${port} at item #${index} return ${res.statusCode}`,
        ));
        return 3;
    });

    handle.on('error', (e) => {
        output.write(new Error(
            `http://${hostname || '?'}:${port || '?'} at item #${index} return ${e.message}`,
        ));
        output.end();
        handle.abort();
    });

    handle.setNoDelay(false);

    input
        .pipe(ezs('group'))
        .pipe(ezs('pack'))
        .pipe(ezs.compress())
        .pipe(handle);
    const duplex = [input, output, index];
    return duplex;
};

export const sendServer = (handle, data) => {
    handle[0].write(data);
    handle[0].end();
    return handle[1];
};

export function writeTo(stream, data, cb) {
    const check = stream.write(data);
    if (!check) {
        stream.once('drain', cb);
    } else {
        process.nextTick(cb);
    }
    return check;
}
