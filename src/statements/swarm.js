import pMap from 'p-map';
import File from '../file';
import Commands from '../commands';
import Workers from '../workers';
import { DEBUG } from '../constants';
import {
    registerCommands,
    inspectServers,
    connectServer,
    sendServer,
} from '../protocol';

export default function swarm(data, feed) {
    if (this.isLast()) {
        return feed.close();
    }
    if (this.isFirst()) {
        this.request = connectServer(this.ezs, {}, e => feed.stop(e));

        const servers = inspectServers(this.getParam('server', []));
        const file = this.getParam('file');
        const script = this.getParam('script', File(this.ezs, file));
        const cmds = new Commands(this.ezs.parseString(script));
        const commands = this.getParam('commands', cmds.get());

        pMap(servers, server => registerCommands(this.ezs, server, commands).catch((e) => {
            DEBUG(`Unable to register commands with the server: ${server}`, e);
        })).then((workers) => {
            this.servers = new Workers(workers);
            const worker = this.servers.choose();
            const handle = this.request(worker, this.getIndex());
            return sendServer(handle, data)
                .on('error', e => feed.write(e))
                .on('data', d => feed.write(d))
                .on('end', () => feed.end());
        }).catch((e) => {
            DEBUG('Unable to connect to workers', e);
            feed.stop(e);
        });
        return null;
    }
    const server = this.servers.choose();
    const handle = this.request(server, this.getIndex());
    return sendServer(handle, data)
        .on('error', e => feed.write(e))
        .on('data', d => feed.write(d))
        .on('end', () => feed.end());
}
