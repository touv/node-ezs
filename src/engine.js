import { Transform } from 'stream';
import Feed from './feed';

export default class Engine extends Transform {
    constructor(func, params, tagname) {
        super({ objectMode: true });
        this.func = func;
        this.index = 0;
        this.tagname = tagname;
        this.params = params || {};
        this.scope = {};
    }

    _transform(chunk, encoding, done) {
        this.index += 1;
        if (this.tagname && chunk.tagName && this.tagname === chunk.tagName()) {
            this.execWith(chunk, done);
        } else if (this.tagname && chunk.tagName && this.tagname !== chunk.tagName()) {
            this.push(chunk);
            done();
        } else if (this.tagname && !chunk.tagName) {
            this.push(chunk);
            done();
        } else {
            this.execWith(chunk, done);
        }
    }

    _flush(done) {
        this.execWith(null, done);
    }

    execWith(chunk, done) {
        const push = (data) => {
            if (data instanceof Error) {
                return this.push(this.createError(data));
            }
            if (this.tagname && chunk && chunk.tagName) {
                data.tagName = chunk.tagName;
            }
            return this.push(data);
        };
        const feed = new Feed(push, done);
        this.scope.isFirst = () => (this.index === 1);
        this.scope.getIndex = () => this.index;
        this.scope.isLast = () => (chunk === null);
        this.scope.getParams = () => this.params;
        this.scope.getParam = (name, defval) => (this.params[name] ? this.params[name] : defval);

        try {
            this.func.call(this.scope, chunk, feed);
        } catch (e) {
            // console.error(this.createError(e));
            this.push(this.createError(e));
        }
    }

    createError(e) {
        const err = new Error('At index #'.concat(this.index).concat(' > ').concat(e.stack));
        //    err.index = self.index;
        //    err.scope = self.scope;
        // e.chunk = chunk; mmmm it's bad idea...
        /*
     e.toString = function() {
      return e.errmsg;
    }
    */
        return err;
    }

}
