import _ from 'lodash';
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

export const inspectServers = (servers, ns = NSHARDS) => _
    .chain(Array.isArray(servers) ? servers : [servers])
    .compact()
    .uniq()
    .map(parseAddress)
    .map(s => Array(ns).fill(s)) // multiple each line
    .value()
    .reduce((a, b) => a.concat(b), []); // flatten all

export const registerCommands = (ezs, { hostname, port }, commands) => new Promise((resolve, reject) => {
    const requestOptions = {
        hostname,
        port,
        path: '/',
        method: 'POST',
        headers: {
            'Transfer-Encoding': 'chunked',
            'Content-Type': 'application/json',
            'X-Parameter': Parameter.pack(),
        },
        agent,
    };
    DEBUG(`Client will register commands to SRV//${hostname}:${port} `);
    const req = http.request(requestOptions, (res) => {
        let requestResponse = '';
        res.setEncoding('utf8');
        res.on('error', (error) => {
            reject(error);
        });
        res.on('data', (chunk) => {
            requestResponse += chunk;
        });
        res.on('end', () => {
            try {
                const result = JSON.parse(requestResponse);
                DEBUG(
                    `Client received STMT#${result} from SRV//${hostname}:${port} `,
                );
                resolve({
                    hostname,
                    port,
                    path: `/${result}`,
                    method: 'POST',
                    headers: {
                        'Transfer-Encoding': 'chunked',
                        'Content-Type': ' application/json',
                    },
                    agent,
                });
            } catch (e) {
                reject(e);
            }
        });
    });
    req.on('error', (e) => {
        reject(e);
    });
    const input = new PassThrough(ezs.objectMode());
    input
        .pipe(ezs('group'))
        .pipe(ezs('pack'))
        .pipe(ezs.compress())
        .pipe(req);
    commands.forEach(command => input.write(command));
    input.end();
});

export const connectServer = (ezs, environment, onerror) => (serverOptions, index) => {
    const opts = {
        ...serverOptions,
        timeout: 0,
        headers: environment,
    };
    const { hostname, port } = opts;
    const input = new PassThrough(ezs.objectMode());
    const output = new PassThrough(ezs.objectMode());
    DEBUG(`Client will send data to SRV//${hostname}:${port} `);
    const handle = http.request(opts, (res) => {
        if (res.statusCode === 200) {
            res
                .pipe(ezs.uncompress())
                .pipe(ezs('unpack'))
                .pipe(ezs('ungroup'))
                .on('data', chunk => output.write(chunk))
                .on('end', () => output.end());
        } else {
            onerror(new Error(
                `SRV//${hostname}:${port}#${index} return ${res.statusCode}`,
            ));
            output.end();
        }
    });

    handle.on('error', (e) => {
        onerror(new Error(
            `SRV//${hostname || '?'}:${port || '?'}#${index} return ${e.message}`,
        ));
        output.end();
        handle.abort();
    });

    handle.setNoDelay(false);

    input
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
