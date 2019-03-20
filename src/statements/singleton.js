import { PassThrough } from 'stream';
import { addedDiff } from 'deep-object-diff';

export default function singleton(data, feed) {
    if (this.isLast()) {
        return feed.close();
    }
    if (this.isFirst()) {
        const { ezs } = this;
        const statement = this.getParam('statement');
        const environment = this.getEnv();
        const paramaters = this.getParams();
        const savedData = Object.assign({}, data);
        const input = new PassThrough({ objectMode: true });
        let result;

        input
            .pipe(ezs(statement, paramaters, environment))
            .pipe(ezs.catch(e => feed.write(e)))
            .on('error', e => feed.write(e))
            .on('data', (chunk) => {
                if (typeof chunk === 'object') {
                    if (!result) {
                        result = {};
                    }
                    result = Object.assign(result, chunk);
                } else {
                    if (!result) {
                        result = '';
                    }
                    result += chunk;
                }
            })
            .on('end', () => {
                this.addedResult = addedDiff(savedData, result);
                feed.send(Object.assign(data, this.addedResult));
            });
        input.write(data);
        return input.end();
    }

    return feed.send(Object.assign(data, this.addedResult));
}
