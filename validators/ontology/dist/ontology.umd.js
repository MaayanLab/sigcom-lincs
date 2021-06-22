(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('stream'), require('http'), require('url'), require('https'), require('zlib'), require('util')) :
	typeof define === 'function' && define.amd ? define(['stream', 'http', 'url', 'https', 'zlib', 'util'], factory) :
	(global = global || self, global.ontologyValidator = factory(global.Stream, global.http, global.url, global.https, global.zlib, global.util$2));
}(this, (function (Stream, http, Url, https, zlib, util$2) {
	Stream = Stream && Object.prototype.hasOwnProperty.call(Stream, 'default') ? Stream['default'] : Stream;
	http = http && Object.prototype.hasOwnProperty.call(http, 'default') ? http['default'] : http;
	Url = Url && Object.prototype.hasOwnProperty.call(Url, 'default') ? Url['default'] : Url;
	https = https && Object.prototype.hasOwnProperty.call(https, 'default') ? https['default'] : https;
	zlib = zlib && Object.prototype.hasOwnProperty.call(zlib, 'default') ? zlib['default'] : zlib;
	util$2 = util$2 && Object.prototype.hasOwnProperty.call(util$2, 'default') ? util$2['default'] : util$2;

	// Based on https://github.com/tmpvar/jsdom/blob/aa85b2abf07766ff7bf5c1f6daafb3726f2f2db5/lib/jsdom/living/blob.js

	// fix for "Readable" isn't a named export issue
	const Readable = Stream.Readable;

	const BUFFER = Symbol('buffer');
	const TYPE = Symbol('type');

	class Blob {
		constructor() {
			this[TYPE] = '';

			const blobParts = arguments[0];
			const options = arguments[1];

			const buffers = [];

			if (blobParts) {
				const a = blobParts;
				const length = Number(a.length);
				for (let i = 0; i < length; i++) {
					const element = a[i];
					let buffer;
					if (element instanceof Buffer) {
						buffer = element;
					} else if (ArrayBuffer.isView(element)) {
						buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
					} else if (element instanceof ArrayBuffer) {
						buffer = Buffer.from(element);
					} else if (element instanceof Blob) {
						buffer = element[BUFFER];
					} else {
						buffer = Buffer.from(typeof element === 'string' ? element : String(element));
					}
					buffers.push(buffer);
				}
			}

			this[BUFFER] = Buffer.concat(buffers);

			let type = options && options.type !== undefined && String(options.type).toLowerCase();
			if (type && !/[^\u0020-\u007E]/.test(type)) {
				this[TYPE] = type;
			}
		}
		get size() {
			return this[BUFFER].length;
		}
		get type() {
			return this[TYPE];
		}
		text() {
			return Promise.resolve(this[BUFFER].toString());
		}
		arrayBuffer() {
			const buf = this[BUFFER];
			const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
			return Promise.resolve(ab);
		}
		stream() {
			const readable = new Readable();
			readable._read = function () {};
			readable.push(this[BUFFER]);
			readable.push(null);
			return readable;
		}
		toString() {
			return '[object Blob]';
		}
		slice() {
			const size = this.size;

			const start = arguments[0];
			const end = arguments[1];
			let relativeStart, relativeEnd;
			if (start === undefined) {
				relativeStart = 0;
			} else if (start < 0) {
				relativeStart = Math.max(size + start, 0);
			} else {
				relativeStart = Math.min(start, size);
			}
			if (end === undefined) {
				relativeEnd = size;
			} else if (end < 0) {
				relativeEnd = Math.max(size + end, 0);
			} else {
				relativeEnd = Math.min(end, size);
			}
			const span = Math.max(relativeEnd - relativeStart, 0);

			const buffer = this[BUFFER];
			const slicedBuffer = buffer.slice(relativeStart, relativeStart + span);
			const blob = new Blob([], { type: arguments[2] });
			blob[BUFFER] = slicedBuffer;
			return blob;
		}
	}

	Object.defineProperties(Blob.prototype, {
		size: { enumerable: true },
		type: { enumerable: true },
		slice: { enumerable: true }
	});

	Object.defineProperty(Blob.prototype, Symbol.toStringTag, {
		value: 'Blob',
		writable: false,
		enumerable: false,
		configurable: true
	});

	/**
	 * fetch-error.js
	 *
	 * FetchError interface for operational errors
	 */

	/**
	 * Create FetchError instance
	 *
	 * @param   String      message      Error message for human
	 * @param   String      type         Error type for machine
	 * @param   String      systemError  For Node.js system error
	 * @return  FetchError
	 */
	function FetchError(message, type, systemError) {
	  Error.call(this, message);

	  this.message = message;
	  this.type = type;

	  // when err.type is `system`, err.code contains system error code
	  if (systemError) {
	    this.code = this.errno = systemError.code;
	  }

	  // hide custom error implementation details from end-users
	  Error.captureStackTrace(this, this.constructor);
	}

	FetchError.prototype = Object.create(Error.prototype);
	FetchError.prototype.constructor = FetchError;
	FetchError.prototype.name = 'FetchError';

	let convert;
	try {
		convert = require('encoding').convert;
	} catch (e) {}

	const INTERNALS = Symbol('Body internals');

	// fix an issue where "PassThrough" isn't a named export for node <10
	const PassThrough = Stream.PassThrough;

	/**
	 * Body mixin
	 *
	 * Ref: https://fetch.spec.whatwg.org/#body
	 *
	 * @param   Stream  body  Readable stream
	 * @param   Object  opts  Response options
	 * @return  Void
	 */
	function Body(body) {
		var _this = this;

		var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
		    _ref$size = _ref.size;

		let size = _ref$size === undefined ? 0 : _ref$size;
		var _ref$timeout = _ref.timeout;
		let timeout = _ref$timeout === undefined ? 0 : _ref$timeout;

		if (body == null) {
			// body is undefined or null
			body = null;
		} else if (isURLSearchParams(body)) {
			// body is a URLSearchParams
			body = Buffer.from(body.toString());
		} else if (isBlob(body)) ; else if (Buffer.isBuffer(body)) ; else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
			// body is ArrayBuffer
			body = Buffer.from(body);
		} else if (ArrayBuffer.isView(body)) {
			// body is ArrayBufferView
			body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
		} else if (body instanceof Stream) ; else {
			// none of the above
			// coerce to string then buffer
			body = Buffer.from(String(body));
		}
		this[INTERNALS] = {
			body,
			disturbed: false,
			error: null
		};
		this.size = size;
		this.timeout = timeout;

		if (body instanceof Stream) {
			body.on('error', function (err) {
				const error = err.name === 'AbortError' ? err : new FetchError(`Invalid response body while trying to fetch ${_this.url}: ${err.message}`, 'system', err);
				_this[INTERNALS].error = error;
			});
		}
	}

	Body.prototype = {
		get body() {
			return this[INTERNALS].body;
		},

		get bodyUsed() {
			return this[INTERNALS].disturbed;
		},

		/**
	  * Decode response as ArrayBuffer
	  *
	  * @return  Promise
	  */
		arrayBuffer() {
			return consumeBody.call(this).then(function (buf) {
				return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
			});
		},

		/**
	  * Return raw response as Blob
	  *
	  * @return Promise
	  */
		blob() {
			let ct = this.headers && this.headers.get('content-type') || '';
			return consumeBody.call(this).then(function (buf) {
				return Object.assign(
				// Prevent copying
				new Blob([], {
					type: ct.toLowerCase()
				}), {
					[BUFFER]: buf
				});
			});
		},

		/**
	  * Decode response as json
	  *
	  * @return  Promise
	  */
		json() {
			var _this2 = this;

			return consumeBody.call(this).then(function (buffer) {
				try {
					return JSON.parse(buffer.toString());
				} catch (err) {
					return Body.Promise.reject(new FetchError(`invalid json response body at ${_this2.url} reason: ${err.message}`, 'invalid-json'));
				}
			});
		},

		/**
	  * Decode response as text
	  *
	  * @return  Promise
	  */
		text() {
			return consumeBody.call(this).then(function (buffer) {
				return buffer.toString();
			});
		},

		/**
	  * Decode response as buffer (non-spec api)
	  *
	  * @return  Promise
	  */
		buffer() {
			return consumeBody.call(this);
		},

		/**
	  * Decode response as text, while automatically detecting the encoding and
	  * trying to decode to UTF-8 (non-spec api)
	  *
	  * @return  Promise
	  */
		textConverted() {
			var _this3 = this;

			return consumeBody.call(this).then(function (buffer) {
				return convertBody(buffer, _this3.headers);
			});
		}
	};

	// In browsers, all properties are enumerable.
	Object.defineProperties(Body.prototype, {
		body: { enumerable: true },
		bodyUsed: { enumerable: true },
		arrayBuffer: { enumerable: true },
		blob: { enumerable: true },
		json: { enumerable: true },
		text: { enumerable: true }
	});

	Body.mixIn = function (proto) {
		for (const name of Object.getOwnPropertyNames(Body.prototype)) {
			// istanbul ignore else: future proof
			if (!(name in proto)) {
				const desc = Object.getOwnPropertyDescriptor(Body.prototype, name);
				Object.defineProperty(proto, name, desc);
			}
		}
	};

	/**
	 * Consume and convert an entire Body to a Buffer.
	 *
	 * Ref: https://fetch.spec.whatwg.org/#concept-body-consume-body
	 *
	 * @return  Promise
	 */
	function consumeBody() {
		var _this4 = this;

		if (this[INTERNALS].disturbed) {
			return Body.Promise.reject(new TypeError(`body used already for: ${this.url}`));
		}

		this[INTERNALS].disturbed = true;

		if (this[INTERNALS].error) {
			return Body.Promise.reject(this[INTERNALS].error);
		}

		let body = this.body;

		// body is null
		if (body === null) {
			return Body.Promise.resolve(Buffer.alloc(0));
		}

		// body is blob
		if (isBlob(body)) {
			body = body.stream();
		}

		// body is buffer
		if (Buffer.isBuffer(body)) {
			return Body.Promise.resolve(body);
		}

		// istanbul ignore if: should never happen
		if (!(body instanceof Stream)) {
			return Body.Promise.resolve(Buffer.alloc(0));
		}

		// body is stream
		// get ready to actually consume the body
		let accum = [];
		let accumBytes = 0;
		let abort = false;

		return new Body.Promise(function (resolve, reject) {
			let resTimeout;

			// allow timeout on slow response body
			if (_this4.timeout) {
				resTimeout = setTimeout(function () {
					abort = true;
					reject(new FetchError(`Response timeout while trying to fetch ${_this4.url} (over ${_this4.timeout}ms)`, 'body-timeout'));
				}, _this4.timeout);
			}

			// handle stream errors
			body.on('error', function (err) {
				if (err.name === 'AbortError') {
					// if the request was aborted, reject with this Error
					abort = true;
					reject(err);
				} else {
					// other errors, such as incorrect content-encoding
					reject(new FetchError(`Invalid response body while trying to fetch ${_this4.url}: ${err.message}`, 'system', err));
				}
			});

			body.on('data', function (chunk) {
				if (abort || chunk === null) {
					return;
				}

				if (_this4.size && accumBytes + chunk.length > _this4.size) {
					abort = true;
					reject(new FetchError(`content size at ${_this4.url} over limit: ${_this4.size}`, 'max-size'));
					return;
				}

				accumBytes += chunk.length;
				accum.push(chunk);
			});

			body.on('end', function () {
				if (abort) {
					return;
				}

				clearTimeout(resTimeout);

				try {
					resolve(Buffer.concat(accum, accumBytes));
				} catch (err) {
					// handle streams that have accumulated too much data (issue #414)
					reject(new FetchError(`Could not create Buffer from response body for ${_this4.url}: ${err.message}`, 'system', err));
				}
			});
		});
	}

	/**
	 * Detect buffer encoding and convert to target encoding
	 * ref: http://www.w3.org/TR/2011/WD-html5-20110113/parsing.html#determining-the-character-encoding
	 *
	 * @param   Buffer  buffer    Incoming buffer
	 * @param   String  encoding  Target encoding
	 * @return  String
	 */
	function convertBody(buffer, headers) {
		if (typeof convert !== 'function') {
			throw new Error('The package `encoding` must be installed to use the textConverted() function');
		}

		const ct = headers.get('content-type');
		let charset = 'utf-8';
		let res, str;

		// header
		if (ct) {
			res = /charset=([^;]*)/i.exec(ct);
		}

		// no charset in content type, peek at response body for at most 1024 bytes
		str = buffer.slice(0, 1024).toString();

		// html5
		if (!res && str) {
			res = /<meta.+?charset=(['"])(.+?)\1/i.exec(str);
		}

		// html4
		if (!res && str) {
			res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(str);
			if (!res) {
				res = /<meta[\s]+?content=(['"])(.+?)\1[\s]+?http-equiv=(['"])content-type\3/i.exec(str);
				if (res) {
					res.pop(); // drop last quote
				}
			}

			if (res) {
				res = /charset=(.*)/i.exec(res.pop());
			}
		}

		// xml
		if (!res && str) {
			res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(str);
		}

		// found charset
		if (res) {
			charset = res.pop();

			// prevent decode issues when sites use incorrect encoding
			// ref: https://hsivonen.fi/encoding-menu/
			if (charset === 'gb2312' || charset === 'gbk') {
				charset = 'gb18030';
			}
		}

		// turn raw buffers into a single utf-8 buffer
		return convert(buffer, 'UTF-8', charset).toString();
	}

	/**
	 * Detect a URLSearchParams object
	 * ref: https://github.com/bitinn/node-fetch/issues/296#issuecomment-307598143
	 *
	 * @param   Object  obj     Object to detect by type or brand
	 * @return  String
	 */
	function isURLSearchParams(obj) {
		// Duck-typing as a necessary condition.
		if (typeof obj !== 'object' || typeof obj.append !== 'function' || typeof obj.delete !== 'function' || typeof obj.get !== 'function' || typeof obj.getAll !== 'function' || typeof obj.has !== 'function' || typeof obj.set !== 'function') {
			return false;
		}

		// Brand-checking and more duck-typing as optional condition.
		return obj.constructor.name === 'URLSearchParams' || Object.prototype.toString.call(obj) === '[object URLSearchParams]' || typeof obj.sort === 'function';
	}

	/**
	 * Check if `obj` is a W3C `Blob` object (which `File` inherits from)
	 * @param  {*} obj
	 * @return {boolean}
	 */
	function isBlob(obj) {
		return typeof obj === 'object' && typeof obj.arrayBuffer === 'function' && typeof obj.type === 'string' && typeof obj.stream === 'function' && typeof obj.constructor === 'function' && typeof obj.constructor.name === 'string' && /^(Blob|File)$/.test(obj.constructor.name) && /^(Blob|File)$/.test(obj[Symbol.toStringTag]);
	}

	/**
	 * Clone body given Res/Req instance
	 *
	 * @param   Mixed  instance  Response or Request instance
	 * @return  Mixed
	 */
	function clone(instance) {
		let p1, p2;
		let body = instance.body;

		// don't allow cloning a used body
		if (instance.bodyUsed) {
			throw new Error('cannot clone body after it is used');
		}

		// check that body is a stream and not form-data object
		// note: we can't clone the form-data object without having it as a dependency
		if (body instanceof Stream && typeof body.getBoundary !== 'function') {
			// tee instance body
			p1 = new PassThrough();
			p2 = new PassThrough();
			body.pipe(p1);
			body.pipe(p2);
			// set instance body to teed body and return the other teed body
			instance[INTERNALS].body = p1;
			body = p2;
		}

		return body;
	}

	/**
	 * Performs the operation "extract a `Content-Type` value from |object|" as
	 * specified in the specification:
	 * https://fetch.spec.whatwg.org/#concept-bodyinit-extract
	 *
	 * This function assumes that instance.body is present.
	 *
	 * @param   Mixed  instance  Any options.body input
	 */
	function extractContentType(body) {
		if (body === null) {
			// body is null
			return null;
		} else if (typeof body === 'string') {
			// body is string
			return 'text/plain;charset=UTF-8';
		} else if (isURLSearchParams(body)) {
			// body is a URLSearchParams
			return 'application/x-www-form-urlencoded;charset=UTF-8';
		} else if (isBlob(body)) {
			// body is blob
			return body.type || null;
		} else if (Buffer.isBuffer(body)) {
			// body is buffer
			return null;
		} else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
			// body is ArrayBuffer
			return null;
		} else if (ArrayBuffer.isView(body)) {
			// body is ArrayBufferView
			return null;
		} else if (typeof body.getBoundary === 'function') {
			// detect form data input from form-data module
			return `multipart/form-data;boundary=${body.getBoundary()}`;
		} else if (body instanceof Stream) {
			// body is stream
			// can't really do much about this
			return null;
		} else {
			// Body constructor defaults other things to string
			return 'text/plain;charset=UTF-8';
		}
	}

	/**
	 * The Fetch Standard treats this as if "total bytes" is a property on the body.
	 * For us, we have to explicitly get it with a function.
	 *
	 * ref: https://fetch.spec.whatwg.org/#concept-body-total-bytes
	 *
	 * @param   Body    instance   Instance of Body
	 * @return  Number?            Number of bytes, or null if not possible
	 */
	function getTotalBytes(instance) {
		const body = instance.body;


		if (body === null) {
			// body is null
			return 0;
		} else if (isBlob(body)) {
			return body.size;
		} else if (Buffer.isBuffer(body)) {
			// body is buffer
			return body.length;
		} else if (body && typeof body.getLengthSync === 'function') {
			// detect form data input from form-data module
			if (body._lengthRetrievers && body._lengthRetrievers.length == 0 || // 1.x
			body.hasKnownLength && body.hasKnownLength()) {
				// 2.x
				return body.getLengthSync();
			}
			return null;
		} else {
			// body is stream
			return null;
		}
	}

	/**
	 * Write a Body to a Node.js WritableStream (e.g. http.Request) object.
	 *
	 * @param   Body    instance   Instance of Body
	 * @return  Void
	 */
	function writeToStream(dest, instance) {
		const body = instance.body;


		if (body === null) {
			// body is null
			dest.end();
		} else if (isBlob(body)) {
			body.stream().pipe(dest);
		} else if (Buffer.isBuffer(body)) {
			// body is buffer
			dest.write(body);
			dest.end();
		} else {
			// body is stream
			body.pipe(dest);
		}
	}

	// expose Promise
	Body.Promise = global.Promise;

	/**
	 * headers.js
	 *
	 * Headers class offers convenient helpers
	 */

	const invalidTokenRegex = /[^\^_`a-zA-Z\-0-9!#$%&'*+.|~]/;
	const invalidHeaderCharRegex = /[^\t\x20-\x7e\x80-\xff]/;

	function validateName(name) {
		name = `${name}`;
		if (invalidTokenRegex.test(name) || name === '') {
			throw new TypeError(`${name} is not a legal HTTP header name`);
		}
	}

	function validateValue(value) {
		value = `${value}`;
		if (invalidHeaderCharRegex.test(value)) {
			throw new TypeError(`${value} is not a legal HTTP header value`);
		}
	}

	/**
	 * Find the key in the map object given a header name.
	 *
	 * Returns undefined if not found.
	 *
	 * @param   String  name  Header name
	 * @return  String|Undefined
	 */
	function find(map, name) {
		name = name.toLowerCase();
		for (const key in map) {
			if (key.toLowerCase() === name) {
				return key;
			}
		}
		return undefined;
	}

	const MAP = Symbol('map');
	class Headers {
		/**
	  * Headers class
	  *
	  * @param   Object  headers  Response headers
	  * @return  Void
	  */
		constructor() {
			let init = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

			this[MAP] = Object.create(null);

			if (init instanceof Headers) {
				const rawHeaders = init.raw();
				const headerNames = Object.keys(rawHeaders);

				for (const headerName of headerNames) {
					for (const value of rawHeaders[headerName]) {
						this.append(headerName, value);
					}
				}

				return;
			}

			// We don't worry about converting prop to ByteString here as append()
			// will handle it.
			if (init == null) ; else if (typeof init === 'object') {
				const method = init[Symbol.iterator];
				if (method != null) {
					if (typeof method !== 'function') {
						throw new TypeError('Header pairs must be iterable');
					}

					// sequence<sequence<ByteString>>
					// Note: per spec we have to first exhaust the lists then process them
					const pairs = [];
					for (const pair of init) {
						if (typeof pair !== 'object' || typeof pair[Symbol.iterator] !== 'function') {
							throw new TypeError('Each header pair must be iterable');
						}
						pairs.push(Array.from(pair));
					}

					for (const pair of pairs) {
						if (pair.length !== 2) {
							throw new TypeError('Each header pair must be a name/value tuple');
						}
						this.append(pair[0], pair[1]);
					}
				} else {
					// record<ByteString, ByteString>
					for (const key of Object.keys(init)) {
						const value = init[key];
						this.append(key, value);
					}
				}
			} else {
				throw new TypeError('Provided initializer must be an object');
			}
		}

		/**
	  * Return combined header value given name
	  *
	  * @param   String  name  Header name
	  * @return  Mixed
	  */
		get(name) {
			name = `${name}`;
			validateName(name);
			const key = find(this[MAP], name);
			if (key === undefined) {
				return null;
			}

			return this[MAP][key].join(', ');
		}

		/**
	  * Iterate over all headers
	  *
	  * @param   Function  callback  Executed for each item with parameters (value, name, thisArg)
	  * @param   Boolean   thisArg   `this` context for callback function
	  * @return  Void
	  */
		forEach(callback) {
			let thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;

			let pairs = getHeaders(this);
			let i = 0;
			while (i < pairs.length) {
				var _pairs$i = pairs[i];
				const name = _pairs$i[0],
				      value = _pairs$i[1];

				callback.call(thisArg, value, name, this);
				pairs = getHeaders(this);
				i++;
			}
		}

		/**
	  * Overwrite header values given name
	  *
	  * @param   String  name   Header name
	  * @param   String  value  Header value
	  * @return  Void
	  */
		set(name, value) {
			name = `${name}`;
			value = `${value}`;
			validateName(name);
			validateValue(value);
			const key = find(this[MAP], name);
			this[MAP][key !== undefined ? key : name] = [value];
		}

		/**
	  * Append a value onto existing header
	  *
	  * @param   String  name   Header name
	  * @param   String  value  Header value
	  * @return  Void
	  */
		append(name, value) {
			name = `${name}`;
			value = `${value}`;
			validateName(name);
			validateValue(value);
			const key = find(this[MAP], name);
			if (key !== undefined) {
				this[MAP][key].push(value);
			} else {
				this[MAP][name] = [value];
			}
		}

		/**
	  * Check for header name existence
	  *
	  * @param   String   name  Header name
	  * @return  Boolean
	  */
		has(name) {
			name = `${name}`;
			validateName(name);
			return find(this[MAP], name) !== undefined;
		}

		/**
	  * Delete all header values given name
	  *
	  * @param   String  name  Header name
	  * @return  Void
	  */
		delete(name) {
			name = `${name}`;
			validateName(name);
			const key = find(this[MAP], name);
			if (key !== undefined) {
				delete this[MAP][key];
			}
		}

		/**
	  * Return raw headers (non-spec api)
	  *
	  * @return  Object
	  */
		raw() {
			return this[MAP];
		}

		/**
	  * Get an iterator on keys.
	  *
	  * @return  Iterator
	  */
		keys() {
			return createHeadersIterator(this, 'key');
		}

		/**
	  * Get an iterator on values.
	  *
	  * @return  Iterator
	  */
		values() {
			return createHeadersIterator(this, 'value');
		}

		/**
	  * Get an iterator on entries.
	  *
	  * This is the default iterator of the Headers object.
	  *
	  * @return  Iterator
	  */
		[Symbol.iterator]() {
			return createHeadersIterator(this, 'key+value');
		}
	}
	Headers.prototype.entries = Headers.prototype[Symbol.iterator];

	Object.defineProperty(Headers.prototype, Symbol.toStringTag, {
		value: 'Headers',
		writable: false,
		enumerable: false,
		configurable: true
	});

	Object.defineProperties(Headers.prototype, {
		get: { enumerable: true },
		forEach: { enumerable: true },
		set: { enumerable: true },
		append: { enumerable: true },
		has: { enumerable: true },
		delete: { enumerable: true },
		keys: { enumerable: true },
		values: { enumerable: true },
		entries: { enumerable: true }
	});

	function getHeaders(headers) {
		let kind = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'key+value';

		const keys = Object.keys(headers[MAP]).sort();
		return keys.map(kind === 'key' ? function (k) {
			return k.toLowerCase();
		} : kind === 'value' ? function (k) {
			return headers[MAP][k].join(', ');
		} : function (k) {
			return [k.toLowerCase(), headers[MAP][k].join(', ')];
		});
	}

	const INTERNAL = Symbol('internal');

	function createHeadersIterator(target, kind) {
		const iterator = Object.create(HeadersIteratorPrototype);
		iterator[INTERNAL] = {
			target,
			kind,
			index: 0
		};
		return iterator;
	}

	const HeadersIteratorPrototype = Object.setPrototypeOf({
		next() {
			// istanbul ignore if
			if (!this || Object.getPrototypeOf(this) !== HeadersIteratorPrototype) {
				throw new TypeError('Value of `this` is not a HeadersIterator');
			}

			var _INTERNAL = this[INTERNAL];
			const target = _INTERNAL.target,
			      kind = _INTERNAL.kind,
			      index = _INTERNAL.index;

			const values = getHeaders(target, kind);
			const len = values.length;
			if (index >= len) {
				return {
					value: undefined,
					done: true
				};
			}

			this[INTERNAL].index = index + 1;

			return {
				value: values[index],
				done: false
			};
		}
	}, Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())));

	Object.defineProperty(HeadersIteratorPrototype, Symbol.toStringTag, {
		value: 'HeadersIterator',
		writable: false,
		enumerable: false,
		configurable: true
	});

	/**
	 * Export the Headers object in a form that Node.js can consume.
	 *
	 * @param   Headers  headers
	 * @return  Object
	 */
	function exportNodeCompatibleHeaders(headers) {
		const obj = Object.assign({ __proto__: null }, headers[MAP]);

		// http.request() only supports string as Host header. This hack makes
		// specifying custom Host header possible.
		const hostHeaderKey = find(headers[MAP], 'Host');
		if (hostHeaderKey !== undefined) {
			obj[hostHeaderKey] = obj[hostHeaderKey][0];
		}

		return obj;
	}

	/**
	 * Create a Headers object from an object of headers, ignoring those that do
	 * not conform to HTTP grammar productions.
	 *
	 * @param   Object  obj  Object of headers
	 * @return  Headers
	 */
	function createHeadersLenient(obj) {
		const headers = new Headers();
		for (const name of Object.keys(obj)) {
			if (invalidTokenRegex.test(name)) {
				continue;
			}
			if (Array.isArray(obj[name])) {
				for (const val of obj[name]) {
					if (invalidHeaderCharRegex.test(val)) {
						continue;
					}
					if (headers[MAP][name] === undefined) {
						headers[MAP][name] = [val];
					} else {
						headers[MAP][name].push(val);
					}
				}
			} else if (!invalidHeaderCharRegex.test(obj[name])) {
				headers[MAP][name] = [obj[name]];
			}
		}
		return headers;
	}

	const INTERNALS$1 = Symbol('Response internals');

	// fix an issue where "STATUS_CODES" aren't a named export for node <10
	const STATUS_CODES = http.STATUS_CODES;

	/**
	 * Response class
	 *
	 * @param   Stream  body  Readable stream
	 * @param   Object  opts  Response options
	 * @return  Void
	 */
	class Response {
		constructor() {
			let body = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
			let opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

			Body.call(this, body, opts);

			const status = opts.status || 200;
			const headers = new Headers(opts.headers);

			if (body != null && !headers.has('Content-Type')) {
				const contentType = extractContentType(body);
				if (contentType) {
					headers.append('Content-Type', contentType);
				}
			}

			this[INTERNALS$1] = {
				url: opts.url,
				status,
				statusText: opts.statusText || STATUS_CODES[status],
				headers,
				counter: opts.counter
			};
		}

		get url() {
			return this[INTERNALS$1].url || '';
		}

		get status() {
			return this[INTERNALS$1].status;
		}

		/**
	  * Convenience property representing if the request ended normally
	  */
		get ok() {
			return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
		}

		get redirected() {
			return this[INTERNALS$1].counter > 0;
		}

		get statusText() {
			return this[INTERNALS$1].statusText;
		}

		get headers() {
			return this[INTERNALS$1].headers;
		}

		/**
	  * Clone this response
	  *
	  * @return  Response
	  */
		clone() {
			return new Response(clone(this), {
				url: this.url,
				status: this.status,
				statusText: this.statusText,
				headers: this.headers,
				ok: this.ok,
				redirected: this.redirected
			});
		}
	}

	Body.mixIn(Response.prototype);

	Object.defineProperties(Response.prototype, {
		url: { enumerable: true },
		status: { enumerable: true },
		ok: { enumerable: true },
		redirected: { enumerable: true },
		statusText: { enumerable: true },
		headers: { enumerable: true },
		clone: { enumerable: true }
	});

	Object.defineProperty(Response.prototype, Symbol.toStringTag, {
		value: 'Response',
		writable: false,
		enumerable: false,
		configurable: true
	});

	const INTERNALS$2 = Symbol('Request internals');

	// fix an issue where "format", "parse" aren't a named export for node <10
	const parse_url = Url.parse;
	const format_url = Url.format;

	const streamDestructionSupported = 'destroy' in Stream.Readable.prototype;

	/**
	 * Check if a value is an instance of Request.
	 *
	 * @param   Mixed   input
	 * @return  Boolean
	 */
	function isRequest(input) {
		return typeof input === 'object' && typeof input[INTERNALS$2] === 'object';
	}

	function isAbortSignal(signal) {
		const proto = signal && typeof signal === 'object' && Object.getPrototypeOf(signal);
		return !!(proto && proto.constructor.name === 'AbortSignal');
	}

	/**
	 * Request class
	 *
	 * @param   Mixed   input  Url or Request instance
	 * @param   Object  init   Custom options
	 * @return  Void
	 */
	class Request {
		constructor(input) {
			let init = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

			let parsedURL;

			// normalize input
			if (!isRequest(input)) {
				if (input && input.href) {
					// in order to support Node.js' Url objects; though WHATWG's URL objects
					// will fall into this branch also (since their `toString()` will return
					// `href` property anyway)
					parsedURL = parse_url(input.href);
				} else {
					// coerce input to a string before attempting to parse
					parsedURL = parse_url(`${input}`);
				}
				input = {};
			} else {
				parsedURL = parse_url(input.url);
			}

			let method = init.method || input.method || 'GET';
			method = method.toUpperCase();

			if ((init.body != null || isRequest(input) && input.body !== null) && (method === 'GET' || method === 'HEAD')) {
				throw new TypeError('Request with GET/HEAD method cannot have body');
			}

			let inputBody = init.body != null ? init.body : isRequest(input) && input.body !== null ? clone(input) : null;

			Body.call(this, inputBody, {
				timeout: init.timeout || input.timeout || 0,
				size: init.size || input.size || 0
			});

			const headers = new Headers(init.headers || input.headers || {});

			if (inputBody != null && !headers.has('Content-Type')) {
				const contentType = extractContentType(inputBody);
				if (contentType) {
					headers.append('Content-Type', contentType);
				}
			}

			let signal = isRequest(input) ? input.signal : null;
			if ('signal' in init) signal = init.signal;

			if (signal != null && !isAbortSignal(signal)) {
				throw new TypeError('Expected signal to be an instanceof AbortSignal');
			}

			this[INTERNALS$2] = {
				method,
				redirect: init.redirect || input.redirect || 'follow',
				headers,
				parsedURL,
				signal
			};

			// node-fetch-only options
			this.follow = init.follow !== undefined ? init.follow : input.follow !== undefined ? input.follow : 20;
			this.compress = init.compress !== undefined ? init.compress : input.compress !== undefined ? input.compress : true;
			this.counter = init.counter || input.counter || 0;
			this.agent = init.agent || input.agent;
		}

		get method() {
			return this[INTERNALS$2].method;
		}

		get url() {
			return format_url(this[INTERNALS$2].parsedURL);
		}

		get headers() {
			return this[INTERNALS$2].headers;
		}

		get redirect() {
			return this[INTERNALS$2].redirect;
		}

		get signal() {
			return this[INTERNALS$2].signal;
		}

		/**
	  * Clone this request
	  *
	  * @return  Request
	  */
		clone() {
			return new Request(this);
		}
	}

	Body.mixIn(Request.prototype);

	Object.defineProperty(Request.prototype, Symbol.toStringTag, {
		value: 'Request',
		writable: false,
		enumerable: false,
		configurable: true
	});

	Object.defineProperties(Request.prototype, {
		method: { enumerable: true },
		url: { enumerable: true },
		headers: { enumerable: true },
		redirect: { enumerable: true },
		clone: { enumerable: true },
		signal: { enumerable: true }
	});

	/**
	 * Convert a Request to Node.js http request options.
	 *
	 * @param   Request  A Request instance
	 * @return  Object   The options object to be passed to http.request
	 */
	function getNodeRequestOptions(request) {
		const parsedURL = request[INTERNALS$2].parsedURL;
		const headers = new Headers(request[INTERNALS$2].headers);

		// fetch step 1.3
		if (!headers.has('Accept')) {
			headers.set('Accept', '*/*');
		}

		// Basic fetch
		if (!parsedURL.protocol || !parsedURL.hostname) {
			throw new TypeError('Only absolute URLs are supported');
		}

		if (!/^https?:$/.test(parsedURL.protocol)) {
			throw new TypeError('Only HTTP(S) protocols are supported');
		}

		if (request.signal && request.body instanceof Stream.Readable && !streamDestructionSupported) {
			throw new Error('Cancellation of streamed requests with AbortSignal is not supported in node < 8');
		}

		// HTTP-network-or-cache fetch steps 2.4-2.7
		let contentLengthValue = null;
		if (request.body == null && /^(POST|PUT)$/i.test(request.method)) {
			contentLengthValue = '0';
		}
		if (request.body != null) {
			const totalBytes = getTotalBytes(request);
			if (typeof totalBytes === 'number') {
				contentLengthValue = String(totalBytes);
			}
		}
		if (contentLengthValue) {
			headers.set('Content-Length', contentLengthValue);
		}

		// HTTP-network-or-cache fetch step 2.11
		if (!headers.has('User-Agent')) {
			headers.set('User-Agent', 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)');
		}

		// HTTP-network-or-cache fetch step 2.15
		if (request.compress && !headers.has('Accept-Encoding')) {
			headers.set('Accept-Encoding', 'gzip,deflate');
		}

		let agent = request.agent;
		if (typeof agent === 'function') {
			agent = agent(parsedURL);
		}

		if (!headers.has('Connection') && !agent) {
			headers.set('Connection', 'close');
		}

		// HTTP-network fetch step 4.2
		// chunked encoding is handled by Node.js

		return Object.assign({}, parsedURL, {
			method: request.method,
			headers: exportNodeCompatibleHeaders(headers),
			agent
		});
	}

	/**
	 * abort-error.js
	 *
	 * AbortError interface for cancelled requests
	 */

	/**
	 * Create AbortError instance
	 *
	 * @param   String      message      Error message for human
	 * @return  AbortError
	 */
	function AbortError(message) {
	  Error.call(this, message);

	  this.type = 'aborted';
	  this.message = message;

	  // hide custom error implementation details from end-users
	  Error.captureStackTrace(this, this.constructor);
	}

	AbortError.prototype = Object.create(Error.prototype);
	AbortError.prototype.constructor = AbortError;
	AbortError.prototype.name = 'AbortError';

	// fix an issue where "PassThrough", "resolve" aren't a named export for node <10
	const PassThrough$1 = Stream.PassThrough;
	const resolve_url = Url.resolve;

	/**
	 * Fetch function
	 *
	 * @param   Mixed    url   Absolute url or Request instance
	 * @param   Object   opts  Fetch options
	 * @return  Promise
	 */
	function fetch(url, opts) {

		// allow custom promise
		if (!fetch.Promise) {
			throw new Error('native promise missing, set fetch.Promise to your favorite alternative');
		}

		Body.Promise = fetch.Promise;

		// wrap http.request into fetch
		return new fetch.Promise(function (resolve, reject) {
			// build request object
			const request = new Request(url, opts);
			const options = getNodeRequestOptions(request);

			const send = (options.protocol === 'https:' ? https : http).request;
			const signal = request.signal;

			let response = null;

			const abort = function abort() {
				let error = new AbortError('The user aborted a request.');
				reject(error);
				if (request.body && request.body instanceof Stream.Readable) {
					request.body.destroy(error);
				}
				if (!response || !response.body) return;
				response.body.emit('error', error);
			};

			if (signal && signal.aborted) {
				abort();
				return;
			}

			const abortAndFinalize = function abortAndFinalize() {
				abort();
				finalize();
			};

			// send request
			const req = send(options);
			let reqTimeout;

			if (signal) {
				signal.addEventListener('abort', abortAndFinalize);
			}

			function finalize() {
				req.abort();
				if (signal) signal.removeEventListener('abort', abortAndFinalize);
				clearTimeout(reqTimeout);
			}

			if (request.timeout) {
				req.once('socket', function (socket) {
					reqTimeout = setTimeout(function () {
						reject(new FetchError(`network timeout at: ${request.url}`, 'request-timeout'));
						finalize();
					}, request.timeout);
				});
			}

			req.on('error', function (err) {
				reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
				finalize();
			});

			req.on('response', function (res) {
				clearTimeout(reqTimeout);

				const headers = createHeadersLenient(res.headers);

				// HTTP fetch step 5
				if (fetch.isRedirect(res.statusCode)) {
					// HTTP fetch step 5.2
					const location = headers.get('Location');

					// HTTP fetch step 5.3
					const locationURL = location === null ? null : resolve_url(request.url, location);

					// HTTP fetch step 5.5
					switch (request.redirect) {
						case 'error':
							reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, 'no-redirect'));
							finalize();
							return;
						case 'manual':
							// node-fetch-specific step: make manual redirect a bit easier to use by setting the Location header value to the resolved URL.
							if (locationURL !== null) {
								// handle corrupted header
								try {
									headers.set('Location', locationURL);
								} catch (err) {
									// istanbul ignore next: nodejs server prevent invalid response headers, we can't test this through normal request
									reject(err);
								}
							}
							break;
						case 'follow':
							// HTTP-redirect fetch step 2
							if (locationURL === null) {
								break;
							}

							// HTTP-redirect fetch step 5
							if (request.counter >= request.follow) {
								reject(new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect'));
								finalize();
								return;
							}

							// HTTP-redirect fetch step 6 (counter increment)
							// Create a new Request object.
							const requestOpts = {
								headers: new Headers(request.headers),
								follow: request.follow,
								counter: request.counter + 1,
								agent: request.agent,
								compress: request.compress,
								method: request.method,
								body: request.body,
								signal: request.signal,
								timeout: request.timeout,
								size: request.size
							};

							// HTTP-redirect fetch step 9
							if (res.statusCode !== 303 && request.body && getTotalBytes(request) === null) {
								reject(new FetchError('Cannot follow redirect with body being a readable stream', 'unsupported-redirect'));
								finalize();
								return;
							}

							// HTTP-redirect fetch step 11
							if (res.statusCode === 303 || (res.statusCode === 301 || res.statusCode === 302) && request.method === 'POST') {
								requestOpts.method = 'GET';
								requestOpts.body = undefined;
								requestOpts.headers.delete('content-length');
							}

							// HTTP-redirect fetch step 15
							resolve(fetch(new Request(locationURL, requestOpts)));
							finalize();
							return;
					}
				}

				// prepare response
				res.once('end', function () {
					if (signal) signal.removeEventListener('abort', abortAndFinalize);
				});
				let body = res.pipe(new PassThrough$1());

				const response_options = {
					url: request.url,
					status: res.statusCode,
					statusText: res.statusMessage,
					headers: headers,
					size: request.size,
					timeout: request.timeout,
					counter: request.counter
				};

				// HTTP-network fetch step 12.1.1.3
				const codings = headers.get('Content-Encoding');

				// HTTP-network fetch step 12.1.1.4: handle content codings

				// in following scenarios we ignore compression support
				// 1. compression support is disabled
				// 2. HEAD request
				// 3. no Content-Encoding header
				// 4. no content response (204)
				// 5. content not modified response (304)
				if (!request.compress || request.method === 'HEAD' || codings === null || res.statusCode === 204 || res.statusCode === 304) {
					response = new Response(body, response_options);
					resolve(response);
					return;
				}

				// For Node v6+
				// Be less strict when decoding compressed responses, since sometimes
				// servers send slightly invalid responses that are still accepted
				// by common browsers.
				// Always using Z_SYNC_FLUSH is what cURL does.
				const zlibOptions = {
					flush: zlib.Z_SYNC_FLUSH,
					finishFlush: zlib.Z_SYNC_FLUSH
				};

				// for gzip
				if (codings == 'gzip' || codings == 'x-gzip') {
					body = body.pipe(zlib.createGunzip(zlibOptions));
					response = new Response(body, response_options);
					resolve(response);
					return;
				}

				// for deflate
				if (codings == 'deflate' || codings == 'x-deflate') {
					// handle the infamous raw deflate response from old servers
					// a hack for old IIS and Apache servers
					const raw = res.pipe(new PassThrough$1());
					raw.once('data', function (chunk) {
						// see http://stackoverflow.com/questions/37519828
						if ((chunk[0] & 0x0F) === 0x08) {
							body = body.pipe(zlib.createInflate());
						} else {
							body = body.pipe(zlib.createInflateRaw());
						}
						response = new Response(body, response_options);
						resolve(response);
					});
					return;
				}

				// for br
				if (codings == 'br' && typeof zlib.createBrotliDecompress === 'function') {
					body = body.pipe(zlib.createBrotliDecompress());
					response = new Response(body, response_options);
					resolve(response);
					return;
				}

				// otherwise, use response as-is
				response = new Response(body, response_options);
				resolve(response);
			});

			writeToStream(req, request);
		});
	}
	/**
	 * Redirect code matching
	 *
	 * @param   Number   code  Status code
	 * @return  Boolean
	 */
	fetch.isRedirect = function (code) {
		return code === 301 || code === 302 || code === 303 || code === 307 || code === 308;
	};

	// expose Promise
	fetch.Promise = global.Promise;

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn, basedir, module) {
		return module = {
		  path: basedir,
		  exports: {},
		  require: function (path, base) {
	      return commonjsRequire();
	    }
		}, fn(module, module.exports), module.exports;
	}

	function commonjsRequire () {
		throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
	}

	/* eslint complexity: [2, 18], max-statements: [2, 33] */
	var shams = function hasSymbols() {
		if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
		if (typeof Symbol.iterator === 'symbol') { return true; }

		var obj = {};
		var sym = Symbol('test');
		var symObj = Object(sym);
		if (typeof sym === 'string') { return false; }

		if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
		if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

		// temp disabled per https://github.com/ljharb/object.assign/issues/17
		// if (sym instanceof Symbol) { return false; }
		// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
		// if (!(symObj instanceof Symbol)) { return false; }

		// if (typeof Symbol.prototype.toString !== 'function') { return false; }
		// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

		var symVal = 42;
		obj[sym] = symVal;
		for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
		if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

		if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

		var syms = Object.getOwnPropertySymbols(obj);
		if (syms.length !== 1 || syms[0] !== sym) { return false; }

		if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

		if (typeof Object.getOwnPropertyDescriptor === 'function') {
			var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
			if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
		}

		return true;
	};

	var origSymbol = typeof Symbol !== 'undefined' && Symbol;


	var hasSymbols = function hasNativeSymbols() {
		if (typeof origSymbol !== 'function') { return false; }
		if (typeof Symbol !== 'function') { return false; }
		if (typeof origSymbol('foo') !== 'symbol') { return false; }
		if (typeof Symbol('bar') !== 'symbol') { return false; }

		return shams();
	};

	/* eslint no-invalid-this: 1 */

	var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
	var slice = Array.prototype.slice;
	var toStr = Object.prototype.toString;
	var funcType = '[object Function]';

	var implementation = function bind(that) {
	    var target = this;
	    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
	        throw new TypeError(ERROR_MESSAGE + target);
	    }
	    var args = slice.call(arguments, 1);

	    var bound;
	    var binder = function () {
	        if (this instanceof bound) {
	            var result = target.apply(
	                this,
	                args.concat(slice.call(arguments))
	            );
	            if (Object(result) === result) {
	                return result;
	            }
	            return this;
	        } else {
	            return target.apply(
	                that,
	                args.concat(slice.call(arguments))
	            );
	        }
	    };

	    var boundLength = Math.max(0, target.length - args.length);
	    var boundArgs = [];
	    for (var i = 0; i < boundLength; i++) {
	        boundArgs.push('$' + i);
	    }

	    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

	    if (target.prototype) {
	        var Empty = function Empty() {};
	        Empty.prototype = target.prototype;
	        bound.prototype = new Empty();
	        Empty.prototype = null;
	    }

	    return bound;
	};

	var functionBind = Function.prototype.bind || implementation;

	var src = functionBind.call(Function.call, Object.prototype.hasOwnProperty);

	var undefined$1;

	var $SyntaxError = SyntaxError;
	var $Function = Function;
	var $TypeError = TypeError;

	// eslint-disable-next-line consistent-return
	var getEvalledConstructor = function (expressionSyntax) {
		try {
			return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
		} catch (e) {}
	};

	var $gOPD = Object.getOwnPropertyDescriptor;
	if ($gOPD) {
		try {
			$gOPD({}, '');
		} catch (e) {
			$gOPD = null; // this is IE 8, which has a broken gOPD
		}
	}

	var throwTypeError = function () {
		throw new $TypeError();
	};
	var ThrowTypeError = $gOPD
		? (function () {
			try {
				// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
				arguments.callee; // IE 8 does not throw here
				return throwTypeError;
			} catch (calleeThrows) {
				try {
					// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
					return $gOPD(arguments, 'callee').get;
				} catch (gOPDthrows) {
					return throwTypeError;
				}
			}
		}())
		: throwTypeError;

	var hasSymbols$1 = hasSymbols();

	var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

	var needsEval = {};

	var TypedArray = typeof Uint8Array === 'undefined' ? undefined$1 : getProto(Uint8Array);

	var INTRINSICS = {
		'%AggregateError%': typeof AggregateError === 'undefined' ? undefined$1 : AggregateError,
		'%Array%': Array,
		'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined$1 : ArrayBuffer,
		'%ArrayIteratorPrototype%': hasSymbols$1 ? getProto([][Symbol.iterator]()) : undefined$1,
		'%AsyncFromSyncIteratorPrototype%': undefined$1,
		'%AsyncFunction%': needsEval,
		'%AsyncGenerator%': needsEval,
		'%AsyncGeneratorFunction%': needsEval,
		'%AsyncIteratorPrototype%': needsEval,
		'%Atomics%': typeof Atomics === 'undefined' ? undefined$1 : Atomics,
		'%BigInt%': typeof BigInt === 'undefined' ? undefined$1 : BigInt,
		'%Boolean%': Boolean,
		'%DataView%': typeof DataView === 'undefined' ? undefined$1 : DataView,
		'%Date%': Date,
		'%decodeURI%': decodeURI,
		'%decodeURIComponent%': decodeURIComponent,
		'%encodeURI%': encodeURI,
		'%encodeURIComponent%': encodeURIComponent,
		'%Error%': Error,
		'%eval%': eval, // eslint-disable-line no-eval
		'%EvalError%': EvalError,
		'%Float32Array%': typeof Float32Array === 'undefined' ? undefined$1 : Float32Array,
		'%Float64Array%': typeof Float64Array === 'undefined' ? undefined$1 : Float64Array,
		'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined$1 : FinalizationRegistry,
		'%Function%': $Function,
		'%GeneratorFunction%': needsEval,
		'%Int8Array%': typeof Int8Array === 'undefined' ? undefined$1 : Int8Array,
		'%Int16Array%': typeof Int16Array === 'undefined' ? undefined$1 : Int16Array,
		'%Int32Array%': typeof Int32Array === 'undefined' ? undefined$1 : Int32Array,
		'%isFinite%': isFinite,
		'%isNaN%': isNaN,
		'%IteratorPrototype%': hasSymbols$1 ? getProto(getProto([][Symbol.iterator]())) : undefined$1,
		'%JSON%': typeof JSON === 'object' ? JSON : undefined$1,
		'%Map%': typeof Map === 'undefined' ? undefined$1 : Map,
		'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols$1 ? undefined$1 : getProto(new Map()[Symbol.iterator]()),
		'%Math%': Math,
		'%Number%': Number,
		'%Object%': Object,
		'%parseFloat%': parseFloat,
		'%parseInt%': parseInt,
		'%Promise%': typeof Promise === 'undefined' ? undefined$1 : Promise,
		'%Proxy%': typeof Proxy === 'undefined' ? undefined$1 : Proxy,
		'%RangeError%': RangeError,
		'%ReferenceError%': ReferenceError,
		'%Reflect%': typeof Reflect === 'undefined' ? undefined$1 : Reflect,
		'%RegExp%': RegExp,
		'%Set%': typeof Set === 'undefined' ? undefined$1 : Set,
		'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols$1 ? undefined$1 : getProto(new Set()[Symbol.iterator]()),
		'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined$1 : SharedArrayBuffer,
		'%String%': String,
		'%StringIteratorPrototype%': hasSymbols$1 ? getProto(''[Symbol.iterator]()) : undefined$1,
		'%Symbol%': hasSymbols$1 ? Symbol : undefined$1,
		'%SyntaxError%': $SyntaxError,
		'%ThrowTypeError%': ThrowTypeError,
		'%TypedArray%': TypedArray,
		'%TypeError%': $TypeError,
		'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined$1 : Uint8Array,
		'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined$1 : Uint8ClampedArray,
		'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined$1 : Uint16Array,
		'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined$1 : Uint32Array,
		'%URIError%': URIError,
		'%WeakMap%': typeof WeakMap === 'undefined' ? undefined$1 : WeakMap,
		'%WeakRef%': typeof WeakRef === 'undefined' ? undefined$1 : WeakRef,
		'%WeakSet%': typeof WeakSet === 'undefined' ? undefined$1 : WeakSet
	};

	var doEval = function doEval(name) {
		var value;
		if (name === '%AsyncFunction%') {
			value = getEvalledConstructor('async function () {}');
		} else if (name === '%GeneratorFunction%') {
			value = getEvalledConstructor('function* () {}');
		} else if (name === '%AsyncGeneratorFunction%') {
			value = getEvalledConstructor('async function* () {}');
		} else if (name === '%AsyncGenerator%') {
			var fn = doEval('%AsyncGeneratorFunction%');
			if (fn) {
				value = fn.prototype;
			}
		} else if (name === '%AsyncIteratorPrototype%') {
			var gen = doEval('%AsyncGenerator%');
			if (gen) {
				value = getProto(gen.prototype);
			}
		}

		INTRINSICS[name] = value;

		return value;
	};

	var LEGACY_ALIASES = {
		'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
		'%ArrayPrototype%': ['Array', 'prototype'],
		'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
		'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
		'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
		'%ArrayProto_values%': ['Array', 'prototype', 'values'],
		'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
		'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
		'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
		'%BooleanPrototype%': ['Boolean', 'prototype'],
		'%DataViewPrototype%': ['DataView', 'prototype'],
		'%DatePrototype%': ['Date', 'prototype'],
		'%ErrorPrototype%': ['Error', 'prototype'],
		'%EvalErrorPrototype%': ['EvalError', 'prototype'],
		'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
		'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
		'%FunctionPrototype%': ['Function', 'prototype'],
		'%Generator%': ['GeneratorFunction', 'prototype'],
		'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
		'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
		'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
		'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
		'%JSONParse%': ['JSON', 'parse'],
		'%JSONStringify%': ['JSON', 'stringify'],
		'%MapPrototype%': ['Map', 'prototype'],
		'%NumberPrototype%': ['Number', 'prototype'],
		'%ObjectPrototype%': ['Object', 'prototype'],
		'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
		'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
		'%PromisePrototype%': ['Promise', 'prototype'],
		'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
		'%Promise_all%': ['Promise', 'all'],
		'%Promise_reject%': ['Promise', 'reject'],
		'%Promise_resolve%': ['Promise', 'resolve'],
		'%RangeErrorPrototype%': ['RangeError', 'prototype'],
		'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
		'%RegExpPrototype%': ['RegExp', 'prototype'],
		'%SetPrototype%': ['Set', 'prototype'],
		'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
		'%StringPrototype%': ['String', 'prototype'],
		'%SymbolPrototype%': ['Symbol', 'prototype'],
		'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
		'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
		'%TypeErrorPrototype%': ['TypeError', 'prototype'],
		'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
		'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
		'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
		'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
		'%URIErrorPrototype%': ['URIError', 'prototype'],
		'%WeakMapPrototype%': ['WeakMap', 'prototype'],
		'%WeakSetPrototype%': ['WeakSet', 'prototype']
	};



	var $concat = functionBind.call(Function.call, Array.prototype.concat);
	var $spliceApply = functionBind.call(Function.apply, Array.prototype.splice);
	var $replace = functionBind.call(Function.call, String.prototype.replace);
	var $strSlice = functionBind.call(Function.call, String.prototype.slice);

	/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
	var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
	var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
	var stringToPath = function stringToPath(string) {
		var first = $strSlice(string, 0, 1);
		var last = $strSlice(string, -1);
		if (first === '%' && last !== '%') {
			throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
		} else if (last === '%' && first !== '%') {
			throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
		}
		var result = [];
		$replace(string, rePropName, function (match, number, quote, subString) {
			result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
		});
		return result;
	};
	/* end adaptation */

	var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
		var intrinsicName = name;
		var alias;
		if (src(LEGACY_ALIASES, intrinsicName)) {
			alias = LEGACY_ALIASES[intrinsicName];
			intrinsicName = '%' + alias[0] + '%';
		}

		if (src(INTRINSICS, intrinsicName)) {
			var value = INTRINSICS[intrinsicName];
			if (value === needsEval) {
				value = doEval(intrinsicName);
			}
			if (typeof value === 'undefined' && !allowMissing) {
				throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
			}

			return {
				alias: alias,
				name: intrinsicName,
				value: value
			};
		}

		throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
	};

	var getIntrinsic = function GetIntrinsic(name, allowMissing) {
		if (typeof name !== 'string' || name.length === 0) {
			throw new $TypeError('intrinsic name must be a non-empty string');
		}
		if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
			throw new $TypeError('"allowMissing" argument must be a boolean');
		}

		var parts = stringToPath(name);
		var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

		var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
		var intrinsicRealName = intrinsic.name;
		var value = intrinsic.value;
		var skipFurtherCaching = false;

		var alias = intrinsic.alias;
		if (alias) {
			intrinsicBaseName = alias[0];
			$spliceApply(parts, $concat([0, 1], alias));
		}

		for (var i = 1, isOwn = true; i < parts.length; i += 1) {
			var part = parts[i];
			var first = $strSlice(part, 0, 1);
			var last = $strSlice(part, -1);
			if (
				(
					(first === '"' || first === "'" || first === '`')
					|| (last === '"' || last === "'" || last === '`')
				)
				&& first !== last
			) {
				throw new $SyntaxError('property names with quotes must have matching quotes');
			}
			if (part === 'constructor' || !isOwn) {
				skipFurtherCaching = true;
			}

			intrinsicBaseName += '.' + part;
			intrinsicRealName = '%' + intrinsicBaseName + '%';

			if (src(INTRINSICS, intrinsicRealName)) {
				value = INTRINSICS[intrinsicRealName];
			} else if (value != null) {
				if (!(part in value)) {
					if (!allowMissing) {
						throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
					}
					return void undefined$1;
				}
				if ($gOPD && (i + 1) >= parts.length) {
					var desc = $gOPD(value, part);
					isOwn = !!desc;

					// By convention, when a data property is converted to an accessor
					// property to emulate a data property that does not suffer from
					// the override mistake, that accessor's getter is marked with
					// an `originalValue` property. Here, when we detect this, we
					// uphold the illusion by pretending to see that original data
					// property, i.e., returning the value rather than the getter
					// itself.
					if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
						value = desc.get;
					} else {
						value = value[part];
					}
				} else {
					isOwn = src(value, part);
					value = value[part];
				}

				if (isOwn && !skipFurtherCaching) {
					INTRINSICS[intrinsicRealName] = value;
				}
			}
		}
		return value;
	};

	var callBind = createCommonjsModule(function (module) {




	var $apply = getIntrinsic('%Function.prototype.apply%');
	var $call = getIntrinsic('%Function.prototype.call%');
	var $reflectApply = getIntrinsic('%Reflect.apply%', true) || functionBind.call($call, $apply);

	var $gOPD = getIntrinsic('%Object.getOwnPropertyDescriptor%', true);
	var $defineProperty = getIntrinsic('%Object.defineProperty%', true);
	var $max = getIntrinsic('%Math.max%');

	if ($defineProperty) {
		try {
			$defineProperty({}, 'a', { value: 1 });
		} catch (e) {
			// IE 8 has a broken defineProperty
			$defineProperty = null;
		}
	}

	module.exports = function callBind(originalFunction) {
		var func = $reflectApply(functionBind, $call, arguments);
		if ($gOPD && $defineProperty) {
			var desc = $gOPD(func, 'length');
			if (desc.configurable) {
				// original length, plus the receiver, minus any additional arguments (after the receiver)
				$defineProperty(
					func,
					'length',
					{ value: 1 + $max(0, originalFunction.length - (arguments.length - 1)) }
				);
			}
		}
		return func;
	};

	var applyBind = function applyBind() {
		return $reflectApply(functionBind, $apply, arguments);
	};

	if ($defineProperty) {
		$defineProperty(module.exports, 'apply', { value: applyBind });
	} else {
		module.exports.apply = applyBind;
	}
	});

	var $indexOf = callBind(getIntrinsic('String.prototype.indexOf'));

	var callBound = function callBoundIntrinsic(name, allowMissing) {
		var intrinsic = getIntrinsic(name, !!allowMissing);
		if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
			return callBind(intrinsic);
		}
		return intrinsic;
	};

	var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';


	var $toString = callBound('Object.prototype.toString');

	var isStandardArguments = function isArguments(value) {
		if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
			return false;
		}
		return $toString(value) === '[object Arguments]';
	};

	var isLegacyArguments = function isArguments(value) {
		if (isStandardArguments(value)) {
			return true;
		}
		return value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			$toString(value) !== '[object Array]' &&
			$toString(value.callee) === '[object Function]';
	};

	var supportsStandardArguments = (function () {
		return isStandardArguments(arguments);
	}());

	isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

	var isArguments = supportsStandardArguments ? isStandardArguments : isLegacyArguments;

	var toStr$1 = Object.prototype.toString;
	var fnToStr = Function.prototype.toString;
	var isFnRegex = /^\s*(?:function)?\*/;
	var hasToStringTag$1 = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
	var getProto$1 = Object.getPrototypeOf;
	var getGeneratorFunc = function () { // eslint-disable-line consistent-return
		if (!hasToStringTag$1) {
			return false;
		}
		try {
			return Function('return function*() {}')();
		} catch (e) {
		}
	};
	var GeneratorFunction;

	var isGeneratorFunction = function isGeneratorFunction(fn) {
		if (typeof fn !== 'function') {
			return false;
		}
		if (isFnRegex.test(fnToStr.call(fn))) {
			return true;
		}
		if (!hasToStringTag$1) {
			var str = toStr$1.call(fn);
			return str === '[object GeneratorFunction]';
		}
		if (!getProto$1) {
			return false;
		}
		if (typeof GeneratorFunction === 'undefined') {
			var generatorFunc = getGeneratorFunc();
			GeneratorFunction = generatorFunc ? getProto$1(generatorFunc) : false;
		}
		return getProto$1(fn) === GeneratorFunction;
	};

	var hasOwn = Object.prototype.hasOwnProperty;
	var toString = Object.prototype.toString;

	var foreach = function forEach (obj, fn, ctx) {
	    if (toString.call(fn) !== '[object Function]') {
	        throw new TypeError('iterator must be a function');
	    }
	    var l = obj.length;
	    if (l === +l) {
	        for (var i = 0; i < l; i++) {
	            fn.call(ctx, obj[i], i, obj);
	        }
	    } else {
	        for (var k in obj) {
	            if (hasOwn.call(obj, k)) {
	                fn.call(ctx, obj[k], k, obj);
	            }
	        }
	    }
	};

	var possibleNames = [
		'BigInt64Array',
		'BigUint64Array',
		'Float32Array',
		'Float64Array',
		'Int16Array',
		'Int32Array',
		'Int8Array',
		'Uint16Array',
		'Uint32Array',
		'Uint8Array',
		'Uint8ClampedArray'
	];

	var availableTypedArrays = function availableTypedArrays() {
		var out = [];
		for (var i = 0; i < possibleNames.length; i++) {
			if (typeof commonjsGlobal[possibleNames[i]] === 'function') {
				out[out.length] = possibleNames[i];
			}
		}
		return out;
	};

	var $gOPD$1 = getIntrinsic('%Object.getOwnPropertyDescriptor%');
	if ($gOPD$1) {
		try {
			$gOPD$1([], 'length');
		} catch (e) {
			// IE 8 has a broken gOPD
			$gOPD$1 = null;
		}
	}

	var getOwnPropertyDescriptor = $gOPD$1;

	var $toString$1 = callBound('Object.prototype.toString');
	var hasSymbols$2 = hasSymbols();
	var hasToStringTag$2 = hasSymbols$2 && typeof Symbol.toStringTag === 'symbol';

	var typedArrays = availableTypedArrays();

	var $indexOf$1 = callBound('Array.prototype.indexOf', true) || function indexOf(array, value) {
		for (var i = 0; i < array.length; i += 1) {
			if (array[i] === value) {
				return i;
			}
		}
		return -1;
	};
	var $slice = callBound('String.prototype.slice');
	var toStrTags = {};

	var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');
	if (hasToStringTag$2 && getOwnPropertyDescriptor && getPrototypeOf) {
		foreach(typedArrays, function (typedArray) {
			var arr = new commonjsGlobal[typedArray]();
			if (!(Symbol.toStringTag in arr)) {
				throw new EvalError('this engine has support for Symbol.toStringTag, but ' + typedArray + ' does not have the property! Please report this.');
			}
			var proto = getPrototypeOf(arr);
			var descriptor = getOwnPropertyDescriptor(proto, Symbol.toStringTag);
			if (!descriptor) {
				var superProto = getPrototypeOf(proto);
				descriptor = getOwnPropertyDescriptor(superProto, Symbol.toStringTag);
			}
			toStrTags[typedArray] = descriptor.get;
		});
	}

	var tryTypedArrays = function tryAllTypedArrays(value) {
		var anyTrue = false;
		foreach(toStrTags, function (getter, typedArray) {
			if (!anyTrue) {
				try {
					anyTrue = getter.call(value) === typedArray;
				} catch (e) { /**/ }
			}
		});
		return anyTrue;
	};

	var isTypedArray = function isTypedArray(value) {
		if (!value || typeof value !== 'object') { return false; }
		if (!hasToStringTag$2) {
			var tag = $slice($toString$1(value), 8, -1);
			return $indexOf$1(typedArrays, tag) > -1;
		}
		if (!getOwnPropertyDescriptor) { return false; }
		return tryTypedArrays(value);
	};

	var $toString$2 = callBound('Object.prototype.toString');
	var hasSymbols$3 = hasSymbols();
	var hasToStringTag$3 = hasSymbols$3 && typeof Symbol.toStringTag === 'symbol';

	var typedArrays$1 = availableTypedArrays();

	var $slice$1 = callBound('String.prototype.slice');
	var toStrTags$1 = {};

	var getPrototypeOf$1 = Object.getPrototypeOf; // require('getprototypeof');
	if (hasToStringTag$3 && getOwnPropertyDescriptor && getPrototypeOf$1) {
		foreach(typedArrays$1, function (typedArray) {
			if (typeof commonjsGlobal[typedArray] === 'function') {
				var arr = new commonjsGlobal[typedArray]();
				if (!(Symbol.toStringTag in arr)) {
					throw new EvalError('this engine has support for Symbol.toStringTag, but ' + typedArray + ' does not have the property! Please report this.');
				}
				var proto = getPrototypeOf$1(arr);
				var descriptor = getOwnPropertyDescriptor(proto, Symbol.toStringTag);
				if (!descriptor) {
					var superProto = getPrototypeOf$1(proto);
					descriptor = getOwnPropertyDescriptor(superProto, Symbol.toStringTag);
				}
				toStrTags$1[typedArray] = descriptor.get;
			}
		});
	}

	var tryTypedArrays$1 = function tryAllTypedArrays(value) {
		var foundName = false;
		foreach(toStrTags$1, function (getter, typedArray) {
			if (!foundName) {
				try {
					var name = getter.call(value);
					if (name === typedArray) {
						foundName = name;
					}
				} catch (e) {}
			}
		});
		return foundName;
	};



	var whichTypedArray = function whichTypedArray(value) {
		if (!isTypedArray(value)) { return false; }
		if (!hasToStringTag$3) { return $slice$1($toString$2(value), 8, -1); }
		return tryTypedArrays$1(value);
	};

	var types = createCommonjsModule(function (module, exports) {






	function uncurryThis(f) {
	  return f.call.bind(f);
	}

	var BigIntSupported = typeof BigInt !== 'undefined';
	var SymbolSupported = typeof Symbol !== 'undefined';

	var ObjectToString = uncurryThis(Object.prototype.toString);

	var numberValue = uncurryThis(Number.prototype.valueOf);
	var stringValue = uncurryThis(String.prototype.valueOf);
	var booleanValue = uncurryThis(Boolean.prototype.valueOf);

	if (BigIntSupported) {
	  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
	}

	if (SymbolSupported) {
	  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
	}

	function checkBoxedPrimitive(value, prototypeValueOf) {
	  if (typeof value !== 'object') {
	    return false;
	  }
	  try {
	    prototypeValueOf(value);
	    return true;
	  } catch(e) {
	    return false;
	  }
	}

	exports.isArgumentsObject = isArguments;
	exports.isGeneratorFunction = isGeneratorFunction;
	exports.isTypedArray = isTypedArray;

	// Taken from here and modified for better browser support
	// https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
	function isPromise(input) {
		return (
			(
				typeof Promise !== 'undefined' &&
				input instanceof Promise
			) ||
			(
				input !== null &&
				typeof input === 'object' &&
				typeof input.then === 'function' &&
				typeof input.catch === 'function'
			)
		);
	}
	exports.isPromise = isPromise;

	function isArrayBufferView(value) {
	  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
	    return ArrayBuffer.isView(value);
	  }

	  return (
	    isTypedArray(value) ||
	    isDataView(value)
	  );
	}
	exports.isArrayBufferView = isArrayBufferView;


	function isUint8Array(value) {
	  return whichTypedArray(value) === 'Uint8Array';
	}
	exports.isUint8Array = isUint8Array;

	function isUint8ClampedArray(value) {
	  return whichTypedArray(value) === 'Uint8ClampedArray';
	}
	exports.isUint8ClampedArray = isUint8ClampedArray;

	function isUint16Array(value) {
	  return whichTypedArray(value) === 'Uint16Array';
	}
	exports.isUint16Array = isUint16Array;

	function isUint32Array(value) {
	  return whichTypedArray(value) === 'Uint32Array';
	}
	exports.isUint32Array = isUint32Array;

	function isInt8Array(value) {
	  return whichTypedArray(value) === 'Int8Array';
	}
	exports.isInt8Array = isInt8Array;

	function isInt16Array(value) {
	  return whichTypedArray(value) === 'Int16Array';
	}
	exports.isInt16Array = isInt16Array;

	function isInt32Array(value) {
	  return whichTypedArray(value) === 'Int32Array';
	}
	exports.isInt32Array = isInt32Array;

	function isFloat32Array(value) {
	  return whichTypedArray(value) === 'Float32Array';
	}
	exports.isFloat32Array = isFloat32Array;

	function isFloat64Array(value) {
	  return whichTypedArray(value) === 'Float64Array';
	}
	exports.isFloat64Array = isFloat64Array;

	function isBigInt64Array(value) {
	  return whichTypedArray(value) === 'BigInt64Array';
	}
	exports.isBigInt64Array = isBigInt64Array;

	function isBigUint64Array(value) {
	  return whichTypedArray(value) === 'BigUint64Array';
	}
	exports.isBigUint64Array = isBigUint64Array;

	function isMapToString(value) {
	  return ObjectToString(value) === '[object Map]';
	}
	isMapToString.working = (
	  typeof Map !== 'undefined' &&
	  isMapToString(new Map())
	);

	function isMap(value) {
	  if (typeof Map === 'undefined') {
	    return false;
	  }

	  return isMapToString.working
	    ? isMapToString(value)
	    : value instanceof Map;
	}
	exports.isMap = isMap;

	function isSetToString(value) {
	  return ObjectToString(value) === '[object Set]';
	}
	isSetToString.working = (
	  typeof Set !== 'undefined' &&
	  isSetToString(new Set())
	);
	function isSet(value) {
	  if (typeof Set === 'undefined') {
	    return false;
	  }

	  return isSetToString.working
	    ? isSetToString(value)
	    : value instanceof Set;
	}
	exports.isSet = isSet;

	function isWeakMapToString(value) {
	  return ObjectToString(value) === '[object WeakMap]';
	}
	isWeakMapToString.working = (
	  typeof WeakMap !== 'undefined' &&
	  isWeakMapToString(new WeakMap())
	);
	function isWeakMap(value) {
	  if (typeof WeakMap === 'undefined') {
	    return false;
	  }

	  return isWeakMapToString.working
	    ? isWeakMapToString(value)
	    : value instanceof WeakMap;
	}
	exports.isWeakMap = isWeakMap;

	function isWeakSetToString(value) {
	  return ObjectToString(value) === '[object WeakSet]';
	}
	isWeakSetToString.working = (
	  typeof WeakSet !== 'undefined' &&
	  isWeakSetToString(new WeakSet())
	);
	function isWeakSet(value) {
	  return isWeakSetToString(value);
	}
	exports.isWeakSet = isWeakSet;

	function isArrayBufferToString(value) {
	  return ObjectToString(value) === '[object ArrayBuffer]';
	}
	isArrayBufferToString.working = (
	  typeof ArrayBuffer !== 'undefined' &&
	  isArrayBufferToString(new ArrayBuffer())
	);
	function isArrayBuffer(value) {
	  if (typeof ArrayBuffer === 'undefined') {
	    return false;
	  }

	  return isArrayBufferToString.working
	    ? isArrayBufferToString(value)
	    : value instanceof ArrayBuffer;
	}
	exports.isArrayBuffer = isArrayBuffer;

	function isDataViewToString(value) {
	  return ObjectToString(value) === '[object DataView]';
	}
	isDataViewToString.working = (
	  typeof ArrayBuffer !== 'undefined' &&
	  typeof DataView !== 'undefined' &&
	  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
	);
	function isDataView(value) {
	  if (typeof DataView === 'undefined') {
	    return false;
	  }

	  return isDataViewToString.working
	    ? isDataViewToString(value)
	    : value instanceof DataView;
	}
	exports.isDataView = isDataView;

	// Store a copy of SharedArrayBuffer in case it's deleted elsewhere
	var SharedArrayBufferCopy = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
	function isSharedArrayBufferToString(value) {
	  return ObjectToString(value) === '[object SharedArrayBuffer]';
	}
	function isSharedArrayBuffer(value) {
	  if (typeof SharedArrayBufferCopy === 'undefined') {
	    return false;
	  }

	  if (typeof isSharedArrayBufferToString.working === 'undefined') {
	    isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
	  }

	  return isSharedArrayBufferToString.working
	    ? isSharedArrayBufferToString(value)
	    : value instanceof SharedArrayBufferCopy;
	}
	exports.isSharedArrayBuffer = isSharedArrayBuffer;

	function isAsyncFunction(value) {
	  return ObjectToString(value) === '[object AsyncFunction]';
	}
	exports.isAsyncFunction = isAsyncFunction;

	function isMapIterator(value) {
	  return ObjectToString(value) === '[object Map Iterator]';
	}
	exports.isMapIterator = isMapIterator;

	function isSetIterator(value) {
	  return ObjectToString(value) === '[object Set Iterator]';
	}
	exports.isSetIterator = isSetIterator;

	function isGeneratorObject(value) {
	  return ObjectToString(value) === '[object Generator]';
	}
	exports.isGeneratorObject = isGeneratorObject;

	function isWebAssemblyCompiledModule(value) {
	  return ObjectToString(value) === '[object WebAssembly.Module]';
	}
	exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

	function isNumberObject(value) {
	  return checkBoxedPrimitive(value, numberValue);
	}
	exports.isNumberObject = isNumberObject;

	function isStringObject(value) {
	  return checkBoxedPrimitive(value, stringValue);
	}
	exports.isStringObject = isStringObject;

	function isBooleanObject(value) {
	  return checkBoxedPrimitive(value, booleanValue);
	}
	exports.isBooleanObject = isBooleanObject;

	function isBigIntObject(value) {
	  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
	}
	exports.isBigIntObject = isBigIntObject;

	function isSymbolObject(value) {
	  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
	}
	exports.isSymbolObject = isSymbolObject;

	function isBoxedPrimitive(value) {
	  return (
	    isNumberObject(value) ||
	    isStringObject(value) ||
	    isBooleanObject(value) ||
	    isBigIntObject(value) ||
	    isSymbolObject(value)
	  );
	}
	exports.isBoxedPrimitive = isBoxedPrimitive;

	function isAnyArrayBuffer(value) {
	  return typeof Uint8Array !== 'undefined' && (
	    isArrayBuffer(value) ||
	    isSharedArrayBuffer(value)
	  );
	}
	exports.isAnyArrayBuffer = isAnyArrayBuffer;

	['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
	  Object.defineProperty(exports, method, {
	    enumerable: false,
	    value: function() {
	      throw new Error(method + ' is not supported in userland');
	    }
	  });
	});
	});

	var isBuffer = function isBuffer(arg) {
	  return arg instanceof Buffer;
	};

	var inherits_browser = createCommonjsModule(function (module) {
	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    if (superCtor) {
	      ctor.super_ = superCtor;
	      ctor.prototype = Object.create(superCtor.prototype, {
	        constructor: {
	          value: ctor,
	          enumerable: false,
	          writable: true,
	          configurable: true
	        }
	      });
	    }
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    if (superCtor) {
	      ctor.super_ = superCtor;
	      var TempCtor = function () {};
	      TempCtor.prototype = superCtor.prototype;
	      ctor.prototype = new TempCtor();
	      ctor.prototype.constructor = ctor;
	    }
	  };
	}
	});

	var inherits = createCommonjsModule(function (module) {
	try {
	  var util = util$2;
	  /* istanbul ignore next */
	  if (typeof util.inherits !== 'function') throw '';
	  module.exports = util.inherits;
	} catch (e) {
	  /* istanbul ignore next */
	  module.exports = inherits_browser;
	}
	});

	var util = createCommonjsModule(function (module, exports) {
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
	  function getOwnPropertyDescriptors(obj) {
	    var keys = Object.keys(obj);
	    var descriptors = {};
	    for (var i = 0; i < keys.length; i++) {
	      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
	    }
	    return descriptors;
	  };

	var formatRegExp = /%[sdj%]/g;
	exports.format = function(f) {
	  if (!isString(f)) {
	    var objects = [];
	    for (var i = 0; i < arguments.length; i++) {
	      objects.push(inspect(arguments[i]));
	    }
	    return objects.join(' ');
	  }

	  var i = 1;
	  var args = arguments;
	  var len = args.length;
	  var str = String(f).replace(formatRegExp, function(x) {
	    if (x === '%%') return '%';
	    if (i >= len) return x;
	    switch (x) {
	      case '%s': return String(args[i++]);
	      case '%d': return Number(args[i++]);
	      case '%j':
	        try {
	          return JSON.stringify(args[i++]);
	        } catch (_) {
	          return '[Circular]';
	        }
	      default:
	        return x;
	    }
	  });
	  for (var x = args[i]; i < len; x = args[++i]) {
	    if (isNull(x) || !isObject(x)) {
	      str += ' ' + x;
	    } else {
	      str += ' ' + inspect(x);
	    }
	  }
	  return str;
	};


	// Mark that a method should not be used.
	// Returns a modified function which warns once by default.
	// If --no-deprecation is set, then it is a no-op.
	exports.deprecate = function(fn, msg) {
	  if (typeof process !== 'undefined' && process.noDeprecation === true) {
	    return fn;
	  }

	  // Allow for deprecating things in the process of starting up.
	  if (typeof process === 'undefined') {
	    return function() {
	      return exports.deprecate(fn, msg).apply(this, arguments);
	    };
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (process.throwDeprecation) {
	        throw new Error(msg);
	      } else if (process.traceDeprecation) {
	        console.trace(msg);
	      } else {
	        console.error(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	};


	var debugs = {};
	var debugEnvRegex = /^$/;

	if (process.env.NODE_DEBUG) {
	  var debugEnv = process.env.NODE_DEBUG;
	  debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
	    .replace(/\*/g, '.*')
	    .replace(/,/g, '$|^')
	    .toUpperCase();
	  debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
	}
	exports.debuglog = function(set) {
	  set = set.toUpperCase();
	  if (!debugs[set]) {
	    if (debugEnvRegex.test(set)) {
	      var pid = process.pid;
	      debugs[set] = function() {
	        var msg = exports.format.apply(exports, arguments);
	        console.error('%s %d: %s', set, pid, msg);
	      };
	    } else {
	      debugs[set] = function() {};
	    }
	  }
	  return debugs[set];
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
	  // default options
	  var ctx = {
	    seen: [],
	    stylize: stylizeNoColor
	  };
	  // legacy...
	  if (arguments.length >= 3) ctx.depth = arguments[2];
	  if (arguments.length >= 4) ctx.colors = arguments[3];
	  if (isBoolean(opts)) {
	    // legacy...
	    ctx.showHidden = opts;
	  } else if (opts) {
	    // got an "options" object
	    exports._extend(ctx, opts);
	  }
	  // set default options
	  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
	  if (isUndefined(ctx.depth)) ctx.depth = 2;
	  if (isUndefined(ctx.colors)) ctx.colors = false;
	  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
	  if (ctx.colors) ctx.stylize = stylizeWithColor;
	  return formatValue(ctx, obj, ctx.depth);
	}
	exports.inspect = inspect;


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
	  'bold' : [1, 22],
	  'italic' : [3, 23],
	  'underline' : [4, 24],
	  'inverse' : [7, 27],
	  'white' : [37, 39],
	  'grey' : [90, 39],
	  'black' : [30, 39],
	  'blue' : [34, 39],
	  'cyan' : [36, 39],
	  'green' : [32, 39],
	  'magenta' : [35, 39],
	  'red' : [31, 39],
	  'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
	  'special': 'cyan',
	  'number': 'yellow',
	  'boolean': 'yellow',
	  'undefined': 'grey',
	  'null': 'bold',
	  'string': 'green',
	  'date': 'magenta',
	  // "name": intentionally not styling
	  'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
	  var style = inspect.styles[styleType];

	  if (style) {
	    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
	           '\u001b[' + inspect.colors[style][1] + 'm';
	  } else {
	    return str;
	  }
	}


	function stylizeNoColor(str, styleType) {
	  return str;
	}


	function arrayToHash(array) {
	  var hash = {};

	  array.forEach(function(val, idx) {
	    hash[val] = true;
	  });

	  return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
	  // Provide a hook for user-specified inspect functions.
	  // Check that value is an object with an inspect function on it
	  if (ctx.customInspect &&
	      value &&
	      isFunction(value.inspect) &&
	      // Filter out the util module, it's inspect function is special
	      value.inspect !== exports.inspect &&
	      // Also filter out any prototype objects using the circular check.
	      !(value.constructor && value.constructor.prototype === value)) {
	    var ret = value.inspect(recurseTimes, ctx);
	    if (!isString(ret)) {
	      ret = formatValue(ctx, ret, recurseTimes);
	    }
	    return ret;
	  }

	  // Primitive types cannot have properties
	  var primitive = formatPrimitive(ctx, value);
	  if (primitive) {
	    return primitive;
	  }

	  // Look up the keys of the object.
	  var keys = Object.keys(value);
	  var visibleKeys = arrayToHash(keys);

	  if (ctx.showHidden) {
	    keys = Object.getOwnPropertyNames(value);
	  }

	  // IE doesn't make error fields non-enumerable
	  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
	  if (isError(value)
	      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
	    return formatError(value);
	  }

	  // Some type of object without properties can be shortcutted.
	  if (keys.length === 0) {
	    if (isFunction(value)) {
	      var name = value.name ? ': ' + value.name : '';
	      return ctx.stylize('[Function' + name + ']', 'special');
	    }
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    }
	    if (isDate(value)) {
	      return ctx.stylize(Date.prototype.toString.call(value), 'date');
	    }
	    if (isError(value)) {
	      return formatError(value);
	    }
	  }

	  var base = '', array = false, braces = ['{', '}'];

	  // Make Array say that they are Array
	  if (isArray(value)) {
	    array = true;
	    braces = ['[', ']'];
	  }

	  // Make functions say that they are functions
	  if (isFunction(value)) {
	    var n = value.name ? ': ' + value.name : '';
	    base = ' [Function' + n + ']';
	  }

	  // Make RegExps say that they are RegExps
	  if (isRegExp(value)) {
	    base = ' ' + RegExp.prototype.toString.call(value);
	  }

	  // Make dates with properties first say the date
	  if (isDate(value)) {
	    base = ' ' + Date.prototype.toUTCString.call(value);
	  }

	  // Make error with message first say the error
	  if (isError(value)) {
	    base = ' ' + formatError(value);
	  }

	  if (keys.length === 0 && (!array || value.length == 0)) {
	    return braces[0] + base + braces[1];
	  }

	  if (recurseTimes < 0) {
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    } else {
	      return ctx.stylize('[Object]', 'special');
	    }
	  }

	  ctx.seen.push(value);

	  var output;
	  if (array) {
	    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	  } else {
	    output = keys.map(function(key) {
	      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
	    });
	  }

	  ctx.seen.pop();

	  return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
	  if (isUndefined(value))
	    return ctx.stylize('undefined', 'undefined');
	  if (isString(value)) {
	    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	                                             .replace(/'/g, "\\'")
	                                             .replace(/\\"/g, '"') + '\'';
	    return ctx.stylize(simple, 'string');
	  }
	  if (isNumber(value))
	    return ctx.stylize('' + value, 'number');
	  if (isBoolean(value))
	    return ctx.stylize('' + value, 'boolean');
	  // For some reason typeof null is "object", so special case here.
	  if (isNull(value))
	    return ctx.stylize('null', 'null');
	}


	function formatError(value) {
	  return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	  var output = [];
	  for (var i = 0, l = value.length; i < l; ++i) {
	    if (hasOwnProperty(value, String(i))) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          String(i), true));
	    } else {
	      output.push('');
	    }
	  }
	  keys.forEach(function(key) {
	    if (!key.match(/^\d+$/)) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          key, true));
	    }
	  });
	  return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	  var name, str, desc;
	  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
	  if (desc.get) {
	    if (desc.set) {
	      str = ctx.stylize('[Getter/Setter]', 'special');
	    } else {
	      str = ctx.stylize('[Getter]', 'special');
	    }
	  } else {
	    if (desc.set) {
	      str = ctx.stylize('[Setter]', 'special');
	    }
	  }
	  if (!hasOwnProperty(visibleKeys, key)) {
	    name = '[' + key + ']';
	  }
	  if (!str) {
	    if (ctx.seen.indexOf(desc.value) < 0) {
	      if (isNull(recurseTimes)) {
	        str = formatValue(ctx, desc.value, null);
	      } else {
	        str = formatValue(ctx, desc.value, recurseTimes - 1);
	      }
	      if (str.indexOf('\n') > -1) {
	        if (array) {
	          str = str.split('\n').map(function(line) {
	            return '  ' + line;
	          }).join('\n').substr(2);
	        } else {
	          str = '\n' + str.split('\n').map(function(line) {
	            return '   ' + line;
	          }).join('\n');
	        }
	      }
	    } else {
	      str = ctx.stylize('[Circular]', 'special');
	    }
	  }
	  if (isUndefined(name)) {
	    if (array && key.match(/^\d+$/)) {
	      return str;
	    }
	    name = JSON.stringify('' + key);
	    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	      name = name.substr(1, name.length - 2);
	      name = ctx.stylize(name, 'name');
	    } else {
	      name = name.replace(/'/g, "\\'")
	                 .replace(/\\"/g, '"')
	                 .replace(/(^"|"$)/g, "'");
	      name = ctx.stylize(name, 'string');
	    }
	  }

	  return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
	  var length = output.reduce(function(prev, cur) {
	    if (cur.indexOf('\n') >= 0) ;
	    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	  }, 0);

	  if (length > 60) {
	    return braces[0] +
	           (base === '' ? '' : base + '\n ') +
	           ' ' +
	           output.join(',\n  ') +
	           ' ' +
	           braces[1];
	  }

	  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	exports.types = types;

	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;
	exports.types.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;
	exports.types.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;
	exports.types.isNativeError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = isBuffer;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}


	function pad(n) {
	  return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}


	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
	              'Oct', 'Nov', 'Dec'];

	// 26 Feb 16:19:34
	function timestamp() {
	  var d = new Date();
	  var time = [pad(d.getHours()),
	              pad(d.getMinutes()),
	              pad(d.getSeconds())].join(':');
	  return [d.getDate(), months[d.getMonth()], time].join(' ');
	}


	// log is just a thin wrapper to console.log that prepends a timestamp
	exports.log = function() {
	  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
	};


	/**
	 * Inherit the prototype methods from one constructor into another.
	 *
	 * The Function.prototype.inherits from lang.js rewritten as a standalone
	 * function (not on Function.prototype). NOTE: If this file is to be loaded
	 * during bootstrapping this function needs to be rewritten using some native
	 * functions as prototype setup using normal JavaScript does not work as
	 * expected during bootstrapping (see mirror.js in r114903).
	 *
	 * @param {function} ctor Constructor function which needs to inherit the
	 *     prototype.
	 * @param {function} superCtor Constructor function to inherit prototype from.
	 */
	exports.inherits = inherits;

	exports._extend = function(origin, add) {
	  // Don't do anything if add isn't an object
	  if (!add || !isObject(add)) return origin;

	  var keys = Object.keys(add);
	  var i = keys.length;
	  while (i--) {
	    origin[keys[i]] = add[keys[i]];
	  }
	  return origin;
	};

	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

	exports.promisify = function promisify(original) {
	  if (typeof original !== 'function')
	    throw new TypeError('The "original" argument must be of type Function');

	  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
	    var fn = original[kCustomPromisifiedSymbol];
	    if (typeof fn !== 'function') {
	      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
	    }
	    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
	      value: fn, enumerable: false, writable: false, configurable: true
	    });
	    return fn;
	  }

	  function fn() {
	    var promiseResolve, promiseReject;
	    var promise = new Promise(function (resolve, reject) {
	      promiseResolve = resolve;
	      promiseReject = reject;
	    });

	    var args = [];
	    for (var i = 0; i < arguments.length; i++) {
	      args.push(arguments[i]);
	    }
	    args.push(function (err, value) {
	      if (err) {
	        promiseReject(err);
	      } else {
	        promiseResolve(value);
	      }
	    });

	    try {
	      original.apply(this, args);
	    } catch (err) {
	      promiseReject(err);
	    }

	    return promise;
	  }

	  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

	  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
	    value: fn, enumerable: false, writable: false, configurable: true
	  });
	  return Object.defineProperties(
	    fn,
	    getOwnPropertyDescriptors(original)
	  );
	};

	exports.promisify.custom = kCustomPromisifiedSymbol;

	function callbackifyOnRejected(reason, cb) {
	  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
	  // Because `null` is a special error value in callbacks which means "no error
	  // occurred", we error-wrap so the callback consumer can distinguish between
	  // "the promise rejected with null" or "the promise fulfilled with undefined".
	  if (!reason) {
	    var newReason = new Error('Promise was rejected with a falsy value');
	    newReason.reason = reason;
	    reason = newReason;
	  }
	  return cb(reason);
	}

	function callbackify(original) {
	  if (typeof original !== 'function') {
	    throw new TypeError('The "original" argument must be of type Function');
	  }

	  // We DO NOT return the promise as it gives the user a false sense that
	  // the promise is actually somehow related to the callback's execution
	  // and that the callback throwing will reject the promise.
	  function callbackified() {
	    var args = [];
	    for (var i = 0; i < arguments.length; i++) {
	      args.push(arguments[i]);
	    }

	    var maybeCb = args.pop();
	    if (typeof maybeCb !== 'function') {
	      throw new TypeError('The last argument must be of type Function');
	    }
	    var self = this;
	    var cb = function() {
	      return maybeCb.apply(self, arguments);
	    };
	    // In true node style we process the callback on `nextTick` with all the
	    // implications (stack, `uncaughtException`, `async_hooks`)
	    original.apply(this, args)
	      .then(function(ret) { process.nextTick(cb.bind(null, null, ret)); },
	            function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)); });
	  }

	  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
	  Object.defineProperties(callbackified,
	                          getOwnPropertyDescriptors(original));
	  return callbackified;
	}
	exports.callbackify = callbackify;
	});

	// longer be forced to treat every error message change as a semver-major
	// change. The NodeError classes here all expose a `code` property whose
	// value statically and permanently identifies the error. While the error
	// message may change, the code should not.

	function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

	function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

	function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

	var codes = {}; // Lazy loaded

	var assert;
	var util$1;

	function createErrorType(code, message, Base) {
	  if (!Base) {
	    Base = Error;
	  }

	  function getMessage(arg1, arg2, arg3) {
	    if (typeof message === 'string') {
	      return message;
	    } else {
	      return message(arg1, arg2, arg3);
	    }
	  }

	  var NodeError =
	  /*#__PURE__*/
	  function (_Base) {
	    _inherits(NodeError, _Base);

	    function NodeError(arg1, arg2, arg3) {
	      var _this;

	      _classCallCheck(this, NodeError);

	      _this = _possibleConstructorReturn(this, _getPrototypeOf(NodeError).call(this, getMessage(arg1, arg2, arg3)));
	      _this.code = code;
	      return _this;
	    }

	    return NodeError;
	  }(Base);

	  codes[code] = NodeError;
	} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


	function oneOf(expected, thing) {
	  if (Array.isArray(expected)) {
	    var len = expected.length;
	    expected = expected.map(function (i) {
	      return String(i);
	    });

	    if (len > 2) {
	      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
	    } else if (len === 2) {
	      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
	    } else {
	      return "of ".concat(thing, " ").concat(expected[0]);
	    }
	  } else {
	    return "of ".concat(thing, " ").concat(String(expected));
	  }
	} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


	function startsWith(str, search, pos) {
	  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
	} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


	function endsWith(str, search, this_len) {
	  if (this_len === undefined || this_len > str.length) {
	    this_len = str.length;
	  }

	  return str.substring(this_len - search.length, this_len) === search;
	} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


	function includes(str, search, start) {
	  if (typeof start !== 'number') {
	    start = 0;
	  }

	  if (start + search.length > str.length) {
	    return false;
	  } else {
	    return str.indexOf(search, start) !== -1;
	  }
	}

	createErrorType('ERR_AMBIGUOUS_ARGUMENT', 'The "%s" argument is ambiguous. %s', TypeError);
	createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
	  if (assert === undefined) assert = assert_1;
	  assert(typeof name === 'string', "'name' must be a string"); // determiner: 'must be' or 'must not be'

	  var determiner;

	  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
	    determiner = 'must not be';
	    expected = expected.replace(/^not /, '');
	  } else {
	    determiner = 'must be';
	  }

	  var msg;

	  if (endsWith(name, ' argument')) {
	    // For cases like 'first argument'
	    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
	  } else {
	    var type = includes(name, '.') ? 'property' : 'argument';
	    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
	  } // TODO(BridgeAR): Improve the output by showing `null` and similar.


	  msg += ". Received type ".concat(_typeof(actual));
	  return msg;
	}, TypeError);
	createErrorType('ERR_INVALID_ARG_VALUE', function (name, value) {
	  var reason = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'is invalid';
	  if (util$1 === undefined) util$1 = util;
	  var inspected = util$1.inspect(value);

	  if (inspected.length > 128) {
	    inspected = "".concat(inspected.slice(0, 128), "...");
	  }

	  return "The argument '".concat(name, "' ").concat(reason, ". Received ").concat(inspected);
	}, TypeError);
	createErrorType('ERR_INVALID_RETURN_VALUE', function (input, name, value) {
	  var type;

	  if (value && value.constructor && value.constructor.name) {
	    type = "instance of ".concat(value.constructor.name);
	  } else {
	    type = "type ".concat(_typeof(value));
	  }

	  return "Expected ".concat(input, " to be returned from the \"").concat(name, "\"") + " function but got ".concat(type, ".");
	}, TypeError);
	createErrorType('ERR_MISSING_ARGS', function () {
	  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
	    args[_key] = arguments[_key];
	  }

	  if (assert === undefined) assert = assert_1;
	  assert(args.length > 0, 'At least one arg needs to be specified');
	  var msg = 'The ';
	  var len = args.length;
	  args = args.map(function (a) {
	    return "\"".concat(a, "\"");
	  });

	  switch (len) {
	    case 1:
	      msg += "".concat(args[0], " argument");
	      break;

	    case 2:
	      msg += "".concat(args[0], " and ").concat(args[1], " arguments");
	      break;

	    default:
	      msg += args.slice(0, len - 1).join(', ');
	      msg += ", and ".concat(args[len - 1], " arguments");
	      break;
	  }

	  return "".concat(msg, " must be specified");
	}, TypeError);
	var codes_1 = codes;

	var errors = {
		codes: codes_1
	};

	function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

	function _possibleConstructorReturn$1(self, call) { if (call && (_typeof$1(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized$1(self); }

	function _assertThisInitialized$1(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

	function _inherits$1(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf$1(subClass, superClass); }

	function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf$1(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf$1(Wrapper, Class); }; return _wrapNativeSuper(Class); }

	function isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

	function _construct(Parent, args, Class) { if (isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf$1(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

	function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

	function _setPrototypeOf$1(o, p) { _setPrototypeOf$1 = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf$1(o, p); }

	function _getPrototypeOf$1(o) { _getPrototypeOf$1 = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf$1(o); }

	function _typeof$1(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof$1 = function _typeof(obj) { return typeof obj; }; } else { _typeof$1 = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof$1(obj); }

	var inspect = util.inspect;

	var ERR_INVALID_ARG_TYPE = errors.codes.ERR_INVALID_ARG_TYPE; // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


	function endsWith$1(str, search, this_len) {
	  if (this_len === undefined || this_len > str.length) {
	    this_len = str.length;
	  }

	  return str.substring(this_len - search.length, this_len) === search;
	} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat


	function repeat(str, count) {
	  count = Math.floor(count);
	  if (str.length == 0 || count == 0) return '';
	  var maxCount = str.length * count;
	  count = Math.floor(Math.log(count) / Math.log(2));

	  while (count) {
	    str += str;
	    count--;
	  }

	  str += str.substring(0, maxCount - str.length);
	  return str;
	}

	var blue = '';
	var green = '';
	var red = '';
	var white = '';
	var kReadableOperator = {
	  deepStrictEqual: 'Expected values to be strictly deep-equal:',
	  strictEqual: 'Expected values to be strictly equal:',
	  strictEqualObject: 'Expected "actual" to be reference-equal to "expected":',
	  deepEqual: 'Expected values to be loosely deep-equal:',
	  equal: 'Expected values to be loosely equal:',
	  notDeepStrictEqual: 'Expected "actual" not to be strictly deep-equal to:',
	  notStrictEqual: 'Expected "actual" to be strictly unequal to:',
	  notStrictEqualObject: 'Expected "actual" not to be reference-equal to "expected":',
	  notDeepEqual: 'Expected "actual" not to be loosely deep-equal to:',
	  notEqual: 'Expected "actual" to be loosely unequal to:',
	  notIdentical: 'Values identical but not reference-equal:'
	}; // Comparing short primitives should just show === / !== instead of using the
	// diff.

	var kMaxShortLength = 10;

	function copyError(source) {
	  var keys = Object.keys(source);
	  var target = Object.create(Object.getPrototypeOf(source));
	  keys.forEach(function (key) {
	    target[key] = source[key];
	  });
	  Object.defineProperty(target, 'message', {
	    value: source.message
	  });
	  return target;
	}

	function inspectValue(val) {
	  // The util.inspect default values could be changed. This makes sure the
	  // error messages contain the necessary information nevertheless.
	  return inspect(val, {
	    compact: false,
	    customInspect: false,
	    depth: 1000,
	    maxArrayLength: Infinity,
	    // Assert compares only enumerable properties (with a few exceptions).
	    showHidden: false,
	    // Having a long line as error is better than wrapping the line for
	    // comparison for now.
	    // TODO(BridgeAR): `breakLength` should be limited as soon as soon as we
	    // have meta information about the inspected properties (i.e., know where
	    // in what line the property starts and ends).
	    breakLength: Infinity,
	    // Assert does not detect proxies currently.
	    showProxy: false,
	    sorted: true,
	    // Inspect getters as we also check them when comparing entries.
	    getters: true
	  });
	}

	function createErrDiff(actual, expected, operator) {
	  var other = '';
	  var res = '';
	  var lastPos = 0;
	  var end = '';
	  var skipped = false;
	  var actualInspected = inspectValue(actual);
	  var actualLines = actualInspected.split('\n');
	  var expectedLines = inspectValue(expected).split('\n');
	  var i = 0;
	  var indicator = ''; // In case both values are objects explicitly mark them as not reference equal
	  // for the `strictEqual` operator.

	  if (operator === 'strictEqual' && _typeof$1(actual) === 'object' && _typeof$1(expected) === 'object' && actual !== null && expected !== null) {
	    operator = 'strictEqualObject';
	  } // If "actual" and "expected" fit on a single line and they are not strictly
	  // equal, check further special handling.


	  if (actualLines.length === 1 && expectedLines.length === 1 && actualLines[0] !== expectedLines[0]) {
	    var inputLength = actualLines[0].length + expectedLines[0].length; // If the character length of "actual" and "expected" together is less than
	    // kMaxShortLength and if neither is an object and at least one of them is
	    // not `zero`, use the strict equal comparison to visualize the output.

	    if (inputLength <= kMaxShortLength) {
	      if ((_typeof$1(actual) !== 'object' || actual === null) && (_typeof$1(expected) !== 'object' || expected === null) && (actual !== 0 || expected !== 0)) {
	        // -0 === +0
	        return "".concat(kReadableOperator[operator], "\n\n") + "".concat(actualLines[0], " !== ").concat(expectedLines[0], "\n");
	      }
	    } else if (operator !== 'strictEqualObject') {
	      // If the stderr is a tty and the input length is lower than the current
	      // columns per line, add a mismatch indicator below the output. If it is
	      // not a tty, use a default value of 80 characters.
	      var maxLength = process.stderr && process.stderr.isTTY ? process.stderr.columns : 80;

	      if (inputLength < maxLength) {
	        while (actualLines[0][i] === expectedLines[0][i]) {
	          i++;
	        } // Ignore the first characters.


	        if (i > 2) {
	          // Add position indicator for the first mismatch in case it is a
	          // single line and the input length is less than the column length.
	          indicator = "\n  ".concat(repeat(' ', i), "^");
	          i = 0;
	        }
	      }
	    }
	  } // Remove all ending lines that match (this optimizes the output for
	  // readability by reducing the number of total changed lines).


	  var a = actualLines[actualLines.length - 1];
	  var b = expectedLines[expectedLines.length - 1];

	  while (a === b) {
	    if (i++ < 2) {
	      end = "\n  ".concat(a).concat(end);
	    } else {
	      other = a;
	    }

	    actualLines.pop();
	    expectedLines.pop();
	    if (actualLines.length === 0 || expectedLines.length === 0) break;
	    a = actualLines[actualLines.length - 1];
	    b = expectedLines[expectedLines.length - 1];
	  }

	  var maxLines = Math.max(actualLines.length, expectedLines.length); // Strict equal with identical objects that are not identical by reference.
	  // E.g., assert.deepStrictEqual({ a: Symbol() }, { a: Symbol() })

	  if (maxLines === 0) {
	    // We have to get the result again. The lines were all removed before.
	    var _actualLines = actualInspected.split('\n'); // Only remove lines in case it makes sense to collapse those.
	    // TODO: Accept env to always show the full error.


	    if (_actualLines.length > 30) {
	      _actualLines[26] = "".concat(blue, "...").concat(white);

	      while (_actualLines.length > 27) {
	        _actualLines.pop();
	      }
	    }

	    return "".concat(kReadableOperator.notIdentical, "\n\n").concat(_actualLines.join('\n'), "\n");
	  }

	  if (i > 3) {
	    end = "\n".concat(blue, "...").concat(white).concat(end);
	    skipped = true;
	  }

	  if (other !== '') {
	    end = "\n  ".concat(other).concat(end);
	    other = '';
	  }

	  var printedLines = 0;
	  var msg = kReadableOperator[operator] + "\n".concat(green, "+ actual").concat(white, " ").concat(red, "- expected").concat(white);
	  var skippedMsg = " ".concat(blue, "...").concat(white, " Lines skipped");

	  for (i = 0; i < maxLines; i++) {
	    // Only extra expected lines exist
	    var cur = i - lastPos;

	    if (actualLines.length < i + 1) {
	      // If the last diverging line is more than one line above and the
	      // current line is at least line three, add some of the former lines and
	      // also add dots to indicate skipped entries.
	      if (cur > 1 && i > 2) {
	        if (cur > 4) {
	          res += "\n".concat(blue, "...").concat(white);
	          skipped = true;
	        } else if (cur > 3) {
	          res += "\n  ".concat(expectedLines[i - 2]);
	          printedLines++;
	        }

	        res += "\n  ".concat(expectedLines[i - 1]);
	        printedLines++;
	      } // Mark the current line as the last diverging one.


	      lastPos = i; // Add the expected line to the cache.

	      other += "\n".concat(red, "-").concat(white, " ").concat(expectedLines[i]);
	      printedLines++; // Only extra actual lines exist
	    } else if (expectedLines.length < i + 1) {
	      // If the last diverging line is more than one line above and the
	      // current line is at least line three, add some of the former lines and
	      // also add dots to indicate skipped entries.
	      if (cur > 1 && i > 2) {
	        if (cur > 4) {
	          res += "\n".concat(blue, "...").concat(white);
	          skipped = true;
	        } else if (cur > 3) {
	          res += "\n  ".concat(actualLines[i - 2]);
	          printedLines++;
	        }

	        res += "\n  ".concat(actualLines[i - 1]);
	        printedLines++;
	      } // Mark the current line as the last diverging one.


	      lastPos = i; // Add the actual line to the result.

	      res += "\n".concat(green, "+").concat(white, " ").concat(actualLines[i]);
	      printedLines++; // Lines diverge
	    } else {
	      var expectedLine = expectedLines[i];
	      var actualLine = actualLines[i]; // If the lines diverge, specifically check for lines that only diverge by
	      // a trailing comma. In that case it is actually identical and we should
	      // mark it as such.

	      var divergingLines = actualLine !== expectedLine && (!endsWith$1(actualLine, ',') || actualLine.slice(0, -1) !== expectedLine); // If the expected line has a trailing comma but is otherwise identical,
	      // add a comma at the end of the actual line. Otherwise the output could
	      // look weird as in:
	      //
	      //   [
	      //     1         // No comma at the end!
	      // +   2
	      //   ]
	      //

	      if (divergingLines && endsWith$1(expectedLine, ',') && expectedLine.slice(0, -1) === actualLine) {
	        divergingLines = false;
	        actualLine += ',';
	      }

	      if (divergingLines) {
	        // If the last diverging line is more than one line above and the
	        // current line is at least line three, add some of the former lines and
	        // also add dots to indicate skipped entries.
	        if (cur > 1 && i > 2) {
	          if (cur > 4) {
	            res += "\n".concat(blue, "...").concat(white);
	            skipped = true;
	          } else if (cur > 3) {
	            res += "\n  ".concat(actualLines[i - 2]);
	            printedLines++;
	          }

	          res += "\n  ".concat(actualLines[i - 1]);
	          printedLines++;
	        } // Mark the current line as the last diverging one.


	        lastPos = i; // Add the actual line to the result and cache the expected diverging
	        // line so consecutive diverging lines show up as +++--- and not +-+-+-.

	        res += "\n".concat(green, "+").concat(white, " ").concat(actualLine);
	        other += "\n".concat(red, "-").concat(white, " ").concat(expectedLine);
	        printedLines += 2; // Lines are identical
	      } else {
	        // Add all cached information to the result before adding other things
	        // and reset the cache.
	        res += other;
	        other = ''; // If the last diverging line is exactly one line above or if it is the
	        // very first line, add the line to the result.

	        if (cur === 1 || i === 0) {
	          res += "\n  ".concat(actualLine);
	          printedLines++;
	        }
	      }
	    } // Inspected object to big (Show ~20 rows max)


	    if (printedLines > 20 && i < maxLines - 2) {
	      return "".concat(msg).concat(skippedMsg, "\n").concat(res, "\n").concat(blue, "...").concat(white).concat(other, "\n") + "".concat(blue, "...").concat(white);
	    }
	  }

	  return "".concat(msg).concat(skipped ? skippedMsg : '', "\n").concat(res).concat(other).concat(end).concat(indicator);
	}

	var AssertionError =
	/*#__PURE__*/
	function (_Error) {
	  _inherits$1(AssertionError, _Error);

	  function AssertionError(options) {
	    var _this;

	    _classCallCheck$1(this, AssertionError);

	    if (_typeof$1(options) !== 'object' || options === null) {
	      throw new ERR_INVALID_ARG_TYPE('options', 'Object', options);
	    }

	    var message = options.message,
	        operator = options.operator,
	        stackStartFn = options.stackStartFn;
	    var actual = options.actual,
	        expected = options.expected;
	    var limit = Error.stackTraceLimit;
	    Error.stackTraceLimit = 0;

	    if (message != null) {
	      _this = _possibleConstructorReturn$1(this, _getPrototypeOf$1(AssertionError).call(this, String(message)));
	    } else {
	      if (process.stderr && process.stderr.isTTY) {
	        // Reset on each call to make sure we handle dynamically set environment
	        // variables correct.
	        if (process.stderr && process.stderr.getColorDepth && process.stderr.getColorDepth() !== 1) {
	          blue = "\x1B[34m";
	          green = "\x1B[32m";
	          white = "\x1B[39m";
	          red = "\x1B[31m";
	        } else {
	          blue = '';
	          green = '';
	          white = '';
	          red = '';
	        }
	      } // Prevent the error stack from being visible by duplicating the error
	      // in a very close way to the original in case both sides are actually
	      // instances of Error.


	      if (_typeof$1(actual) === 'object' && actual !== null && _typeof$1(expected) === 'object' && expected !== null && 'stack' in actual && actual instanceof Error && 'stack' in expected && expected instanceof Error) {
	        actual = copyError(actual);
	        expected = copyError(expected);
	      }

	      if (operator === 'deepStrictEqual' || operator === 'strictEqual') {
	        _this = _possibleConstructorReturn$1(this, _getPrototypeOf$1(AssertionError).call(this, createErrDiff(actual, expected, operator)));
	      } else if (operator === 'notDeepStrictEqual' || operator === 'notStrictEqual') {
	        // In case the objects are equal but the operator requires unequal, show
	        // the first object and say A equals B
	        var base = kReadableOperator[operator];
	        var res = inspectValue(actual).split('\n'); // In case "actual" is an object, it should not be reference equal.

	        if (operator === 'notStrictEqual' && _typeof$1(actual) === 'object' && actual !== null) {
	          base = kReadableOperator.notStrictEqualObject;
	        } // Only remove lines in case it makes sense to collapse those.
	        // TODO: Accept env to always show the full error.


	        if (res.length > 30) {
	          res[26] = "".concat(blue, "...").concat(white);

	          while (res.length > 27) {
	            res.pop();
	          }
	        } // Only print a single input.


	        if (res.length === 1) {
	          _this = _possibleConstructorReturn$1(this, _getPrototypeOf$1(AssertionError).call(this, "".concat(base, " ").concat(res[0])));
	        } else {
	          _this = _possibleConstructorReturn$1(this, _getPrototypeOf$1(AssertionError).call(this, "".concat(base, "\n\n").concat(res.join('\n'), "\n")));
	        }
	      } else {
	        var _res = inspectValue(actual);

	        var other = '';
	        var knownOperators = kReadableOperator[operator];

	        if (operator === 'notDeepEqual' || operator === 'notEqual') {
	          _res = "".concat(kReadableOperator[operator], "\n\n").concat(_res);

	          if (_res.length > 1024) {
	            _res = "".concat(_res.slice(0, 1021), "...");
	          }
	        } else {
	          other = "".concat(inspectValue(expected));

	          if (_res.length > 512) {
	            _res = "".concat(_res.slice(0, 509), "...");
	          }

	          if (other.length > 512) {
	            other = "".concat(other.slice(0, 509), "...");
	          }

	          if (operator === 'deepEqual' || operator === 'equal') {
	            _res = "".concat(knownOperators, "\n\n").concat(_res, "\n\nshould equal\n\n");
	          } else {
	            other = " ".concat(operator, " ").concat(other);
	          }
	        }

	        _this = _possibleConstructorReturn$1(this, _getPrototypeOf$1(AssertionError).call(this, "".concat(_res).concat(other)));
	      }
	    }

	    Error.stackTraceLimit = limit;
	    _this.generatedMessage = !message;
	    Object.defineProperty(_assertThisInitialized$1(_this), 'name', {
	      value: 'AssertionError [ERR_ASSERTION]',
	      enumerable: false,
	      writable: true,
	      configurable: true
	    });
	    _this.code = 'ERR_ASSERTION';
	    _this.actual = actual;
	    _this.expected = expected;
	    _this.operator = operator;

	    if (Error.captureStackTrace) {
	      // eslint-disable-next-line no-restricted-syntax
	      Error.captureStackTrace(_assertThisInitialized$1(_this), stackStartFn);
	    } // Create error message including the error code in the name.

	    _this.name = 'AssertionError';
	    return _possibleConstructorReturn$1(_this);
	  }

	  _createClass(AssertionError, [{
	    key: "toString",
	    value: function toString() {
	      return "".concat(this.name, " [").concat(this.code, "]: ").concat(this.message);
	    }
	  }, {
	    key: inspect.custom,
	    value: function value(recurseTimes, ctx) {
	      // This limits the `actual` and `expected` property default inspection to
	      // the minimum depth. Otherwise those values would be too verbose compared
	      // to the actual error message which contains a combined view of these two
	      // input values.
	      return inspect(this, _objectSpread({}, ctx, {
	        customInspect: false,
	        depth: 0
	      }));
	    }
	  }]);

	  return AssertionError;
	}(_wrapNativeSuper(Error));

	var assertion_error = AssertionError;

	/**
	 * Code refactored from Mozilla Developer Network:
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
	 */

	function assign(target, firstSource) {
	  if (target === undefined || target === null) {
	    throw new TypeError('Cannot convert first argument to object');
	  }

	  var to = Object(target);
	  for (var i = 1; i < arguments.length; i++) {
	    var nextSource = arguments[i];
	    if (nextSource === undefined || nextSource === null) {
	      continue;
	    }

	    var keysArray = Object.keys(Object(nextSource));
	    for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
	      var nextKey = keysArray[nextIndex];
	      var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
	      if (desc !== undefined && desc.enumerable) {
	        to[nextKey] = nextSource[nextKey];
	      }
	    }
	  }
	  return to;
	}

	function polyfill() {
	  if (!Object.assign) {
	    Object.defineProperty(Object, 'assign', {
	      enumerable: false,
	      configurable: true,
	      writable: true,
	      value: assign
	    });
	  }
	}

	var es6ObjectAssign = {
	  assign: assign,
	  polyfill: polyfill
	};

	var toStr$2 = Object.prototype.toString;

	var isArguments$1 = function isArguments(value) {
		var str = toStr$2.call(value);
		var isArgs = str === '[object Arguments]';
		if (!isArgs) {
			isArgs = str !== '[object Array]' &&
				value !== null &&
				typeof value === 'object' &&
				typeof value.length === 'number' &&
				value.length >= 0 &&
				toStr$2.call(value.callee) === '[object Function]';
		}
		return isArgs;
	};

	var keysShim;
	if (!Object.keys) {
		// modified from https://github.com/es-shims/es5-shim
		var has = Object.prototype.hasOwnProperty;
		var toStr$3 = Object.prototype.toString;
		var isArgs = isArguments$1; // eslint-disable-line global-require
		var isEnumerable = Object.prototype.propertyIsEnumerable;
		var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
		var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
		var dontEnums = [
			'toString',
			'toLocaleString',
			'valueOf',
			'hasOwnProperty',
			'isPrototypeOf',
			'propertyIsEnumerable',
			'constructor'
		];
		var equalsConstructorPrototype = function (o) {
			var ctor = o.constructor;
			return ctor && ctor.prototype === o;
		};
		var excludedKeys = {
			$applicationCache: true,
			$console: true,
			$external: true,
			$frame: true,
			$frameElement: true,
			$frames: true,
			$innerHeight: true,
			$innerWidth: true,
			$onmozfullscreenchange: true,
			$onmozfullscreenerror: true,
			$outerHeight: true,
			$outerWidth: true,
			$pageXOffset: true,
			$pageYOffset: true,
			$parent: true,
			$scrollLeft: true,
			$scrollTop: true,
			$scrollX: true,
			$scrollY: true,
			$self: true,
			$webkitIndexedDB: true,
			$webkitStorageInfo: true,
			$window: true
		};
		var hasAutomationEqualityBug = (function () {
			/* global window */
			if (typeof window === 'undefined') { return false; }
			for (var k in window) {
				try {
					if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
						try {
							equalsConstructorPrototype(window[k]);
						} catch (e) {
							return true;
						}
					}
				} catch (e) {
					return true;
				}
			}
			return false;
		}());
		var equalsConstructorPrototypeIfNotBuggy = function (o) {
			/* global window */
			if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
				return equalsConstructorPrototype(o);
			}
			try {
				return equalsConstructorPrototype(o);
			} catch (e) {
				return false;
			}
		};

		keysShim = function keys(object) {
			var isObject = object !== null && typeof object === 'object';
			var isFunction = toStr$3.call(object) === '[object Function]';
			var isArguments = isArgs(object);
			var isString = isObject && toStr$3.call(object) === '[object String]';
			var theKeys = [];

			if (!isObject && !isFunction && !isArguments) {
				throw new TypeError('Object.keys called on a non-object');
			}

			var skipProto = hasProtoEnumBug && isFunction;
			if (isString && object.length > 0 && !has.call(object, 0)) {
				for (var i = 0; i < object.length; ++i) {
					theKeys.push(String(i));
				}
			}

			if (isArguments && object.length > 0) {
				for (var j = 0; j < object.length; ++j) {
					theKeys.push(String(j));
				}
			} else {
				for (var name in object) {
					if (!(skipProto && name === 'prototype') && has.call(object, name)) {
						theKeys.push(String(name));
					}
				}
			}

			if (hasDontEnumBug) {
				var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

				for (var k = 0; k < dontEnums.length; ++k) {
					if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
						theKeys.push(dontEnums[k]);
					}
				}
			}
			return theKeys;
		};
	}
	var implementation$1 = keysShim;

	var slice$1 = Array.prototype.slice;


	var origKeys = Object.keys;
	var keysShim$1 = origKeys ? function keys(o) { return origKeys(o); } : implementation$1;

	var originalKeys = Object.keys;

	keysShim$1.shim = function shimObjectKeys() {
		if (Object.keys) {
			var keysWorksWithArguments = (function () {
				// Safari 5.0 bug
				var args = Object.keys(arguments);
				return args && args.length === arguments.length;
			}(1, 2));
			if (!keysWorksWithArguments) {
				Object.keys = function keys(object) { // eslint-disable-line func-name-matching
					if (isArguments$1(object)) {
						return originalKeys(slice$1.call(object));
					}
					return originalKeys(object);
				};
			}
		} else {
			Object.keys = keysShim$1;
		}
		return Object.keys || keysShim$1;
	};

	var objectKeys = keysShim$1;

	var hasSymbols$4 = typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol';

	var toStr$4 = Object.prototype.toString;
	var concat = Array.prototype.concat;
	var origDefineProperty = Object.defineProperty;

	var isFunction = function (fn) {
		return typeof fn === 'function' && toStr$4.call(fn) === '[object Function]';
	};

	var arePropertyDescriptorsSupported = function () {
		var obj = {};
		try {
			origDefineProperty(obj, 'x', { enumerable: false, value: obj });
			// eslint-disable-next-line no-unused-vars, no-restricted-syntax
			for (var _ in obj) { // jscs:ignore disallowUnusedVariables
				return false;
			}
			return obj.x === obj;
		} catch (e) { /* this is IE 8. */
			return false;
		}
	};
	var supportsDescriptors = origDefineProperty && arePropertyDescriptorsSupported();

	var defineProperty = function (object, name, value, predicate) {
		if (name in object && (!isFunction(predicate) || !predicate())) {
			return;
		}
		if (supportsDescriptors) {
			origDefineProperty(object, name, {
				configurable: true,
				enumerable: false,
				value: value,
				writable: true
			});
		} else {
			object[name] = value;
		}
	};

	var defineProperties = function (object, map) {
		var predicates = arguments.length > 2 ? arguments[2] : {};
		var props = objectKeys(map);
		if (hasSymbols$4) {
			props = concat.call(props, Object.getOwnPropertySymbols(map));
		}
		for (var i = 0; i < props.length; i += 1) {
			defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
		}
	};

	defineProperties.supportsDescriptors = !!supportsDescriptors;

	var defineProperties_1 = defineProperties;

	var numberIsNaN = function (value) {
		return value !== value;
	};

	var implementation$2 = function is(a, b) {
		if (a === 0 && b === 0) {
			return 1 / a === 1 / b;
		}
		if (a === b) {
			return true;
		}
		if (numberIsNaN(a) && numberIsNaN(b)) {
			return true;
		}
		return false;
	};

	var polyfill$1 = function getPolyfill() {
		return typeof Object.is === 'function' ? Object.is : implementation$2;
	};

	var shim = function shimObjectIs() {
		var polyfill = polyfill$1();
		defineProperties_1(Object, { is: polyfill }, {
			is: function testObjectIs() {
				return Object.is !== polyfill;
			}
		});
		return polyfill;
	};

	var polyfill$2 = callBind(polyfill$1(), Object);

	defineProperties_1(polyfill$2, {
		getPolyfill: polyfill$1,
		implementation: implementation$2,
		shim: shim
	});

	var objectIs = polyfill$2;

	/* http://www.ecma-international.org/ecma-262/6.0/#sec-number.isnan */

	var implementation$3 = function isNaN(value) {
		return value !== value;
	};

	var polyfill$3 = function getPolyfill() {
		if (Number.isNaN && Number.isNaN(NaN) && !Number.isNaN('a')) {
			return Number.isNaN;
		}
		return implementation$3;
	};

	/* http://www.ecma-international.org/ecma-262/6.0/#sec-number.isnan */

	var shim$1 = function shimNumberIsNaN() {
		var polyfill = polyfill$3();
		defineProperties_1(Number, { isNaN: polyfill }, {
			isNaN: function testIsNaN() {
				return Number.isNaN !== polyfill;
			}
		});
		return polyfill;
	};

	var polyfill$4 = callBind(polyfill$3(), Number);

	/* http://www.ecma-international.org/ecma-262/6.0/#sec-number.isnan */

	defineProperties_1(polyfill$4, {
		getPolyfill: polyfill$3,
		implementation: implementation$3,
		shim: shim$1
	});

	var isNan = polyfill$4;

	function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

	function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

	function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

	function _typeof$2(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof$2 = function _typeof(obj) { return typeof obj; }; } else { _typeof$2 = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof$2(obj); }

	var regexFlagsSupported = /a/g.flags !== undefined;

	var arrayFromSet = function arrayFromSet(set) {
	  var array = [];
	  set.forEach(function (value) {
	    return array.push(value);
	  });
	  return array;
	};

	var arrayFromMap = function arrayFromMap(map) {
	  var array = [];
	  map.forEach(function (value, key) {
	    return array.push([key, value]);
	  });
	  return array;
	};

	var objectIs$1 = Object.is ? Object.is : objectIs;
	var objectGetOwnPropertySymbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols : function () {
	  return [];
	};
	var numberIsNaN$1 = Number.isNaN ? Number.isNaN : isNan;

	function uncurryThis(f) {
	  return f.call.bind(f);
	}

	var hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
	var propertyIsEnumerable = uncurryThis(Object.prototype.propertyIsEnumerable);
	var objectToString = uncurryThis(Object.prototype.toString);

	var _require$types = util.types,
	    isAnyArrayBuffer = _require$types.isAnyArrayBuffer,
	    isArrayBufferView = _require$types.isArrayBufferView,
	    isDate = _require$types.isDate,
	    isMap = _require$types.isMap,
	    isRegExp = _require$types.isRegExp,
	    isSet = _require$types.isSet,
	    isNativeError = _require$types.isNativeError,
	    isBoxedPrimitive = _require$types.isBoxedPrimitive,
	    isNumberObject = _require$types.isNumberObject,
	    isStringObject = _require$types.isStringObject,
	    isBooleanObject = _require$types.isBooleanObject,
	    isBigIntObject = _require$types.isBigIntObject,
	    isSymbolObject = _require$types.isSymbolObject,
	    isFloat32Array = _require$types.isFloat32Array,
	    isFloat64Array = _require$types.isFloat64Array;

	function isNonIndex(key) {
	  if (key.length === 0 || key.length > 10) return true;

	  for (var i = 0; i < key.length; i++) {
	    var code = key.charCodeAt(i);
	    if (code < 48 || code > 57) return true;
	  } // The maximum size for an array is 2 ** 32 -1.


	  return key.length === 10 && key >= Math.pow(2, 32);
	}

	function getOwnNonIndexProperties(value) {
	  return Object.keys(value).filter(isNonIndex).concat(objectGetOwnPropertySymbols(value).filter(Object.prototype.propertyIsEnumerable.bind(value)));
	} // Taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
	// original notice:

	/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */


	function compare(a, b) {
	  if (a === b) {
	    return 0;
	  }

	  var x = a.length;
	  var y = b.length;

	  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i];
	      y = b[i];
	      break;
	    }
	  }

	  if (x < y) {
	    return -1;
	  }

	  if (y < x) {
	    return 1;
	  }

	  return 0;
	}
	var kStrict = true;
	var kLoose = false;
	var kNoIterator = 0;
	var kIsArray = 1;
	var kIsSet = 2;
	var kIsMap = 3; // Check if they have the same source and flags

	function areSimilarRegExps(a, b) {
	  return regexFlagsSupported ? a.source === b.source && a.flags === b.flags : RegExp.prototype.toString.call(a) === RegExp.prototype.toString.call(b);
	}

	function areSimilarFloatArrays(a, b) {
	  if (a.byteLength !== b.byteLength) {
	    return false;
	  }

	  for (var offset = 0; offset < a.byteLength; offset++) {
	    if (a[offset] !== b[offset]) {
	      return false;
	    }
	  }

	  return true;
	}

	function areSimilarTypedArrays(a, b) {
	  if (a.byteLength !== b.byteLength) {
	    return false;
	  }

	  return compare(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), new Uint8Array(b.buffer, b.byteOffset, b.byteLength)) === 0;
	}

	function areEqualArrayBuffers(buf1, buf2) {
	  return buf1.byteLength === buf2.byteLength && compare(new Uint8Array(buf1), new Uint8Array(buf2)) === 0;
	}

	function isEqualBoxedPrimitive(val1, val2) {
	  if (isNumberObject(val1)) {
	    return isNumberObject(val2) && objectIs$1(Number.prototype.valueOf.call(val1), Number.prototype.valueOf.call(val2));
	  }

	  if (isStringObject(val1)) {
	    return isStringObject(val2) && String.prototype.valueOf.call(val1) === String.prototype.valueOf.call(val2);
	  }

	  if (isBooleanObject(val1)) {
	    return isBooleanObject(val2) && Boolean.prototype.valueOf.call(val1) === Boolean.prototype.valueOf.call(val2);
	  }

	  if (isBigIntObject(val1)) {
	    return isBigIntObject(val2) && BigInt.prototype.valueOf.call(val1) === BigInt.prototype.valueOf.call(val2);
	  }

	  return isSymbolObject(val2) && Symbol.prototype.valueOf.call(val1) === Symbol.prototype.valueOf.call(val2);
	} // Notes: Type tags are historical [[Class]] properties that can be set by
	// FunctionTemplate::SetClassName() in C++ or Symbol.toStringTag in JS
	// and retrieved using Object.prototype.toString.call(obj) in JS
	// See https://tc39.github.io/ecma262/#sec-object.prototype.tostring
	// for a list of tags pre-defined in the spec.
	// There are some unspecified tags in the wild too (e.g. typed array tags).
	// Since tags can be altered, they only serve fast failures
	//
	// Typed arrays and buffers are checked by comparing the content in their
	// underlying ArrayBuffer. This optimization requires that it's
	// reasonable to interpret their underlying memory in the same way,
	// which is checked by comparing their type tags.
	// (e.g. a Uint8Array and a Uint16Array with the same memory content
	// could still be different because they will be interpreted differently).
	//
	// For strict comparison, objects should have
	// a) The same built-in type tags
	// b) The same prototypes.


	function innerDeepEqual(val1, val2, strict, memos) {
	  // All identical values are equivalent, as determined by ===.
	  if (val1 === val2) {
	    if (val1 !== 0) return true;
	    return strict ? objectIs$1(val1, val2) : true;
	  } // Check more closely if val1 and val2 are equal.


	  if (strict) {
	    if (_typeof$2(val1) !== 'object') {
	      return typeof val1 === 'number' && numberIsNaN$1(val1) && numberIsNaN$1(val2);
	    }

	    if (_typeof$2(val2) !== 'object' || val1 === null || val2 === null) {
	      return false;
	    }

	    if (Object.getPrototypeOf(val1) !== Object.getPrototypeOf(val2)) {
	      return false;
	    }
	  } else {
	    if (val1 === null || _typeof$2(val1) !== 'object') {
	      if (val2 === null || _typeof$2(val2) !== 'object') {
	        // eslint-disable-next-line eqeqeq
	        return val1 == val2;
	      }

	      return false;
	    }

	    if (val2 === null || _typeof$2(val2) !== 'object') {
	      return false;
	    }
	  }

	  var val1Tag = objectToString(val1);
	  var val2Tag = objectToString(val2);

	  if (val1Tag !== val2Tag) {
	    return false;
	  }

	  if (Array.isArray(val1)) {
	    // Check for sparse arrays and general fast path
	    if (val1.length !== val2.length) {
	      return false;
	    }

	    var keys1 = getOwnNonIndexProperties(val1);
	    var keys2 = getOwnNonIndexProperties(val2);

	    if (keys1.length !== keys2.length) {
	      return false;
	    }

	    return keyCheck(val1, val2, strict, memos, kIsArray, keys1);
	  } // [browserify] This triggers on certain types in IE (Map/Set) so we don't
	  // wan't to early return out of the rest of the checks. However we can check
	  // if the second value is one of these values and the first isn't.


	  if (val1Tag === '[object Object]') {
	    // return keyCheck(val1, val2, strict, memos, kNoIterator);
	    if (!isMap(val1) && isMap(val2) || !isSet(val1) && isSet(val2)) {
	      return false;
	    }
	  }

	  if (isDate(val1)) {
	    if (!isDate(val2) || Date.prototype.getTime.call(val1) !== Date.prototype.getTime.call(val2)) {
	      return false;
	    }
	  } else if (isRegExp(val1)) {
	    if (!isRegExp(val2) || !areSimilarRegExps(val1, val2)) {
	      return false;
	    }
	  } else if (isNativeError(val1) || val1 instanceof Error) {
	    // Do not compare the stack as it might differ even though the error itself
	    // is otherwise identical.
	    if (val1.message !== val2.message || val1.name !== val2.name) {
	      return false;
	    }
	  } else if (isArrayBufferView(val1)) {
	    if (!strict && (isFloat32Array(val1) || isFloat64Array(val1))) {
	      if (!areSimilarFloatArrays(val1, val2)) {
	        return false;
	      }
	    } else if (!areSimilarTypedArrays(val1, val2)) {
	      return false;
	    } // Buffer.compare returns true, so val1.length === val2.length. If they both
	    // only contain numeric keys, we don't need to exam further than checking
	    // the symbols.


	    var _keys = getOwnNonIndexProperties(val1);

	    var _keys2 = getOwnNonIndexProperties(val2);

	    if (_keys.length !== _keys2.length) {
	      return false;
	    }

	    return keyCheck(val1, val2, strict, memos, kNoIterator, _keys);
	  } else if (isSet(val1)) {
	    if (!isSet(val2) || val1.size !== val2.size) {
	      return false;
	    }

	    return keyCheck(val1, val2, strict, memos, kIsSet);
	  } else if (isMap(val1)) {
	    if (!isMap(val2) || val1.size !== val2.size) {
	      return false;
	    }

	    return keyCheck(val1, val2, strict, memos, kIsMap);
	  } else if (isAnyArrayBuffer(val1)) {
	    if (!areEqualArrayBuffers(val1, val2)) {
	      return false;
	    }
	  } else if (isBoxedPrimitive(val1) && !isEqualBoxedPrimitive(val1, val2)) {
	    return false;
	  }

	  return keyCheck(val1, val2, strict, memos, kNoIterator);
	}

	function getEnumerables(val, keys) {
	  return keys.filter(function (k) {
	    return propertyIsEnumerable(val, k);
	  });
	}

	function keyCheck(val1, val2, strict, memos, iterationType, aKeys) {
	  // For all remaining Object pairs, including Array, objects and Maps,
	  // equivalence is determined by having:
	  // a) The same number of owned enumerable properties
	  // b) The same set of keys/indexes (although not necessarily the same order)
	  // c) Equivalent values for every corresponding key/index
	  // d) For Sets and Maps, equal contents
	  // Note: this accounts for both named and indexed properties on Arrays.
	  if (arguments.length === 5) {
	    aKeys = Object.keys(val1);
	    var bKeys = Object.keys(val2); // The pair must have the same number of owned properties.

	    if (aKeys.length !== bKeys.length) {
	      return false;
	    }
	  } // Cheap key test


	  var i = 0;

	  for (; i < aKeys.length; i++) {
	    if (!hasOwnProperty(val2, aKeys[i])) {
	      return false;
	    }
	  }

	  if (strict && arguments.length === 5) {
	    var symbolKeysA = objectGetOwnPropertySymbols(val1);

	    if (symbolKeysA.length !== 0) {
	      var count = 0;

	      for (i = 0; i < symbolKeysA.length; i++) {
	        var key = symbolKeysA[i];

	        if (propertyIsEnumerable(val1, key)) {
	          if (!propertyIsEnumerable(val2, key)) {
	            return false;
	          }

	          aKeys.push(key);
	          count++;
	        } else if (propertyIsEnumerable(val2, key)) {
	          return false;
	        }
	      }

	      var symbolKeysB = objectGetOwnPropertySymbols(val2);

	      if (symbolKeysA.length !== symbolKeysB.length && getEnumerables(val2, symbolKeysB).length !== count) {
	        return false;
	      }
	    } else {
	      var _symbolKeysB = objectGetOwnPropertySymbols(val2);

	      if (_symbolKeysB.length !== 0 && getEnumerables(val2, _symbolKeysB).length !== 0) {
	        return false;
	      }
	    }
	  }

	  if (aKeys.length === 0 && (iterationType === kNoIterator || iterationType === kIsArray && val1.length === 0 || val1.size === 0)) {
	    return true;
	  } // Use memos to handle cycles.


	  if (memos === undefined) {
	    memos = {
	      val1: new Map(),
	      val2: new Map(),
	      position: 0
	    };
	  } else {
	    // We prevent up to two map.has(x) calls by directly retrieving the value
	    // and checking for undefined. The map can only contain numbers, so it is
	    // safe to check for undefined only.
	    var val2MemoA = memos.val1.get(val1);

	    if (val2MemoA !== undefined) {
	      var val2MemoB = memos.val2.get(val2);

	      if (val2MemoB !== undefined) {
	        return val2MemoA === val2MemoB;
	      }
	    }

	    memos.position++;
	  }

	  memos.val1.set(val1, memos.position);
	  memos.val2.set(val2, memos.position);
	  var areEq = objEquiv(val1, val2, strict, aKeys, memos, iterationType);
	  memos.val1.delete(val1);
	  memos.val2.delete(val2);
	  return areEq;
	}

	function setHasEqualElement(set, val1, strict, memo) {
	  // Go looking.
	  var setValues = arrayFromSet(set);

	  for (var i = 0; i < setValues.length; i++) {
	    var val2 = setValues[i];

	    if (innerDeepEqual(val1, val2, strict, memo)) {
	      // Remove the matching element to make sure we do not check that again.
	      set.delete(val2);
	      return true;
	    }
	  }

	  return false;
	} // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#Loose_equality_using
	// Sadly it is not possible to detect corresponding values properly in case the
	// type is a string, number, bigint or boolean. The reason is that those values
	// can match lots of different string values (e.g., 1n == '+00001').


	function findLooseMatchingPrimitives(prim) {
	  switch (_typeof$2(prim)) {
	    case 'undefined':
	      return null;

	    case 'object':
	      // Only pass in null as object!
	      return undefined;

	    case 'symbol':
	      return false;

	    case 'string':
	      prim = +prim;
	    // Loose equal entries exist only if the string is possible to convert to
	    // a regular number and not NaN.
	    // Fall through

	    case 'number':
	      if (numberIsNaN$1(prim)) {
	        return false;
	      }

	  }

	  return true;
	}

	function setMightHaveLoosePrim(a, b, prim) {
	  var altValue = findLooseMatchingPrimitives(prim);
	  if (altValue != null) return altValue;
	  return b.has(altValue) && !a.has(altValue);
	}

	function mapMightHaveLoosePrim(a, b, prim, item, memo) {
	  var altValue = findLooseMatchingPrimitives(prim);

	  if (altValue != null) {
	    return altValue;
	  }

	  var curB = b.get(altValue);

	  if (curB === undefined && !b.has(altValue) || !innerDeepEqual(item, curB, false, memo)) {
	    return false;
	  }

	  return !a.has(altValue) && innerDeepEqual(item, curB, false, memo);
	}

	function setEquiv(a, b, strict, memo) {
	  // This is a lazily initiated Set of entries which have to be compared
	  // pairwise.
	  var set = null;
	  var aValues = arrayFromSet(a);

	  for (var i = 0; i < aValues.length; i++) {
	    var val = aValues[i]; // Note: Checking for the objects first improves the performance for object
	    // heavy sets but it is a minor slow down for primitives. As they are fast
	    // to check this improves the worst case scenario instead.

	    if (_typeof$2(val) === 'object' && val !== null) {
	      if (set === null) {
	        set = new Set();
	      } // If the specified value doesn't exist in the second set its an not null
	      // object (or non strict only: a not matching primitive) we'll need to go
	      // hunting for something thats deep-(strict-)equal to it. To make this
	      // O(n log n) complexity we have to copy these values in a new set first.


	      set.add(val);
	    } else if (!b.has(val)) {
	      if (strict) return false; // Fast path to detect missing string, symbol, undefined and null values.

	      if (!setMightHaveLoosePrim(a, b, val)) {
	        return false;
	      }

	      if (set === null) {
	        set = new Set();
	      }

	      set.add(val);
	    }
	  }

	  if (set !== null) {
	    var bValues = arrayFromSet(b);

	    for (var _i = 0; _i < bValues.length; _i++) {
	      var _val = bValues[_i]; // We have to check if a primitive value is already
	      // matching and only if it's not, go hunting for it.

	      if (_typeof$2(_val) === 'object' && _val !== null) {
	        if (!setHasEqualElement(set, _val, strict, memo)) return false;
	      } else if (!strict && !a.has(_val) && !setHasEqualElement(set, _val, strict, memo)) {
	        return false;
	      }
	    }

	    return set.size === 0;
	  }

	  return true;
	}

	function mapHasEqualEntry(set, map, key1, item1, strict, memo) {
	  // To be able to handle cases like:
	  //   Map([[{}, 'a'], [{}, 'b']]) vs Map([[{}, 'b'], [{}, 'a']])
	  // ... we need to consider *all* matching keys, not just the first we find.
	  var setValues = arrayFromSet(set);

	  for (var i = 0; i < setValues.length; i++) {
	    var key2 = setValues[i];

	    if (innerDeepEqual(key1, key2, strict, memo) && innerDeepEqual(item1, map.get(key2), strict, memo)) {
	      set.delete(key2);
	      return true;
	    }
	  }

	  return false;
	}

	function mapEquiv(a, b, strict, memo) {
	  var set = null;
	  var aEntries = arrayFromMap(a);

	  for (var i = 0; i < aEntries.length; i++) {
	    var _aEntries$i = _slicedToArray(aEntries[i], 2),
	        key = _aEntries$i[0],
	        item1 = _aEntries$i[1];

	    if (_typeof$2(key) === 'object' && key !== null) {
	      if (set === null) {
	        set = new Set();
	      }

	      set.add(key);
	    } else {
	      // By directly retrieving the value we prevent another b.has(key) check in
	      // almost all possible cases.
	      var item2 = b.get(key);

	      if (item2 === undefined && !b.has(key) || !innerDeepEqual(item1, item2, strict, memo)) {
	        if (strict) return false; // Fast path to detect missing string, symbol, undefined and null
	        // keys.

	        if (!mapMightHaveLoosePrim(a, b, key, item1, memo)) return false;

	        if (set === null) {
	          set = new Set();
	        }

	        set.add(key);
	      }
	    }
	  }

	  if (set !== null) {
	    var bEntries = arrayFromMap(b);

	    for (var _i2 = 0; _i2 < bEntries.length; _i2++) {
	      var _bEntries$_i = _slicedToArray(bEntries[_i2], 2),
	          key = _bEntries$_i[0],
	          item = _bEntries$_i[1];

	      if (_typeof$2(key) === 'object' && key !== null) {
	        if (!mapHasEqualEntry(set, a, key, item, strict, memo)) return false;
	      } else if (!strict && (!a.has(key) || !innerDeepEqual(a.get(key), item, false, memo)) && !mapHasEqualEntry(set, a, key, item, false, memo)) {
	        return false;
	      }
	    }

	    return set.size === 0;
	  }

	  return true;
	}

	function objEquiv(a, b, strict, keys, memos, iterationType) {
	  // Sets and maps don't have their entries accessible via normal object
	  // properties.
	  var i = 0;

	  if (iterationType === kIsSet) {
	    if (!setEquiv(a, b, strict, memos)) {
	      return false;
	    }
	  } else if (iterationType === kIsMap) {
	    if (!mapEquiv(a, b, strict, memos)) {
	      return false;
	    }
	  } else if (iterationType === kIsArray) {
	    for (; i < a.length; i++) {
	      if (hasOwnProperty(a, i)) {
	        if (!hasOwnProperty(b, i) || !innerDeepEqual(a[i], b[i], strict, memos)) {
	          return false;
	        }
	      } else if (hasOwnProperty(b, i)) {
	        return false;
	      } else {
	        // Array is sparse.
	        var keysA = Object.keys(a);

	        for (; i < keysA.length; i++) {
	          var key = keysA[i];

	          if (!hasOwnProperty(b, key) || !innerDeepEqual(a[key], b[key], strict, memos)) {
	            return false;
	          }
	        }

	        if (keysA.length !== Object.keys(b).length) {
	          return false;
	        }

	        return true;
	      }
	    }
	  } // The pair must have equivalent values for every corresponding key.
	  // Possibly expensive deep test:


	  for (i = 0; i < keys.length; i++) {
	    var _key = keys[i];

	    if (!innerDeepEqual(a[_key], b[_key], strict, memos)) {
	      return false;
	    }
	  }

	  return true;
	}

	function isDeepEqual(val1, val2) {
	  return innerDeepEqual(val1, val2, kLoose);
	}

	function isDeepStrictEqual(val1, val2) {
	  return innerDeepEqual(val1, val2, kStrict);
	}

	var comparisons = {
	  isDeepEqual: isDeepEqual,
	  isDeepStrictEqual: isDeepStrictEqual
	};

	var assert_1 = createCommonjsModule(function (module) {

	function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var _require$codes = errors.codes,
	    ERR_AMBIGUOUS_ARGUMENT = _require$codes.ERR_AMBIGUOUS_ARGUMENT,
	    ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
	    ERR_INVALID_ARG_VALUE = _require$codes.ERR_INVALID_ARG_VALUE,
	    ERR_INVALID_RETURN_VALUE = _require$codes.ERR_INVALID_RETURN_VALUE,
	    ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS;



	var inspect = util.inspect;

	var _require$types = util.types,
	    isPromise = _require$types.isPromise,
	    isRegExp = _require$types.isRegExp;

	var objectAssign = Object.assign ? Object.assign : es6ObjectAssign.assign;
	var objectIs$1 = Object.is ? Object.is : objectIs;
	var isDeepEqual;
	var isDeepStrictEqual;

	function lazyLoadComparison() {
	  var comparison = comparisons;

	  isDeepEqual = comparison.isDeepEqual;
	  isDeepStrictEqual = comparison.isDeepStrictEqual;
	} // Escape control characters but not \n and \t to keep the line breaks and

	var warned = false; // The assert module provides functions that throw
	// AssertionError's when particular conditions are not met. The
	// assert module must conform to the following interface.

	var assert = module.exports = ok;
	var NO_EXCEPTION_SENTINEL = {}; // All of the following functions must throw an AssertionError
	// when a corresponding condition is not met, with a message that
	// may be undefined if not provided. All assertion methods provide
	// both the actual and expected values to the assertion error for
	// display purposes.

	function innerFail(obj) {
	  if (obj.message instanceof Error) throw obj.message;
	  throw new assertion_error(obj);
	}

	function fail(actual, expected, message, operator, stackStartFn) {
	  var argsLen = arguments.length;
	  var internalMessage;

	  if (argsLen === 0) {
	    internalMessage = 'Failed';
	  } else if (argsLen === 1) {
	    message = actual;
	    actual = undefined;
	  } else {
	    if (warned === false) {
	      warned = true;
	      var warn = process.emitWarning ? process.emitWarning : console.warn.bind(console);
	      warn('assert.fail() with more than one argument is deprecated. ' + 'Please use assert.strictEqual() instead or only pass a message.', 'DeprecationWarning', 'DEP0094');
	    }

	    if (argsLen === 2) operator = '!=';
	  }

	  if (message instanceof Error) throw message;
	  var errArgs = {
	    actual: actual,
	    expected: expected,
	    operator: operator === undefined ? 'fail' : operator,
	    stackStartFn: stackStartFn || fail
	  };

	  if (message !== undefined) {
	    errArgs.message = message;
	  }

	  var err = new assertion_error(errArgs);

	  if (internalMessage) {
	    err.message = internalMessage;
	    err.generatedMessage = true;
	  }

	  throw err;
	}

	assert.fail = fail; // The AssertionError is defined in internal/error.

	assert.AssertionError = assertion_error;

	function innerOk(fn, argLen, value, message) {
	  if (!value) {
	    var generatedMessage = false;

	    if (argLen === 0) {
	      generatedMessage = true;
	      message = 'No value argument passed to `assert.ok()`';
	    } else if (message instanceof Error) {
	      throw message;
	    }

	    var err = new assertion_error({
	      actual: value,
	      expected: true,
	      message: message,
	      operator: '==',
	      stackStartFn: fn
	    });
	    err.generatedMessage = generatedMessage;
	    throw err;
	  }
	} // Pure assertion tests whether a value is truthy, as determined
	// by !!value.


	function ok() {
	  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
	    args[_key] = arguments[_key];
	  }

	  innerOk.apply(void 0, [ok, args.length].concat(args));
	}

	assert.ok = ok; // The equality assertion tests shallow, coercive equality with ==.

	/* eslint-disable no-restricted-properties */

	assert.equal = function equal(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  } // eslint-disable-next-line eqeqeq


	  if (actual != expected) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: '==',
	      stackStartFn: equal
	    });
	  }
	}; // The non-equality assertion tests for whether two objects are not
	// equal with !=.


	assert.notEqual = function notEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  } // eslint-disable-next-line eqeqeq


	  if (actual == expected) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: '!=',
	      stackStartFn: notEqual
	    });
	  }
	}; // The equivalence assertion tests a deep equality relation.


	assert.deepEqual = function deepEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }

	  if (isDeepEqual === undefined) lazyLoadComparison();

	  if (!isDeepEqual(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'deepEqual',
	      stackStartFn: deepEqual
	    });
	  }
	}; // The non-equivalence assertion tests for any deep inequality.


	assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }

	  if (isDeepEqual === undefined) lazyLoadComparison();

	  if (isDeepEqual(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'notDeepEqual',
	      stackStartFn: notDeepEqual
	    });
	  }
	};
	/* eslint-enable */


	assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }

	  if (isDeepEqual === undefined) lazyLoadComparison();

	  if (!isDeepStrictEqual(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'deepStrictEqual',
	      stackStartFn: deepStrictEqual
	    });
	  }
	};

	assert.notDeepStrictEqual = notDeepStrictEqual;

	function notDeepStrictEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }

	  if (isDeepEqual === undefined) lazyLoadComparison();

	  if (isDeepStrictEqual(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'notDeepStrictEqual',
	      stackStartFn: notDeepStrictEqual
	    });
	  }
	}

	assert.strictEqual = function strictEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }

	  if (!objectIs$1(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'strictEqual',
	      stackStartFn: strictEqual
	    });
	  }
	};

	assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }

	  if (objectIs$1(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'notStrictEqual',
	      stackStartFn: notStrictEqual
	    });
	  }
	};

	var Comparison = function Comparison(obj, keys, actual) {
	  var _this = this;

	  _classCallCheck(this, Comparison);

	  keys.forEach(function (key) {
	    if (key in obj) {
	      if (actual !== undefined && typeof actual[key] === 'string' && isRegExp(obj[key]) && obj[key].test(actual[key])) {
	        _this[key] = actual[key];
	      } else {
	        _this[key] = obj[key];
	      }
	    }
	  });
	};

	function compareExceptionKey(actual, expected, key, message, keys, fn) {
	  if (!(key in actual) || !isDeepStrictEqual(actual[key], expected[key])) {
	    if (!message) {
	      // Create placeholder objects to create a nice output.
	      var a = new Comparison(actual, keys);
	      var b = new Comparison(expected, keys, actual);
	      var err = new assertion_error({
	        actual: a,
	        expected: b,
	        operator: 'deepStrictEqual',
	        stackStartFn: fn
	      });
	      err.actual = actual;
	      err.expected = expected;
	      err.operator = fn.name;
	      throw err;
	    }

	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: fn.name,
	      stackStartFn: fn
	    });
	  }
	}

	function expectedException(actual, expected, msg, fn) {
	  if (typeof expected !== 'function') {
	    if (isRegExp(expected)) return expected.test(actual); // assert.doesNotThrow does not accept objects.

	    if (arguments.length === 2) {
	      throw new ERR_INVALID_ARG_TYPE('expected', ['Function', 'RegExp'], expected);
	    } // Handle primitives properly.


	    if (_typeof(actual) !== 'object' || actual === null) {
	      var err = new assertion_error({
	        actual: actual,
	        expected: expected,
	        message: msg,
	        operator: 'deepStrictEqual',
	        stackStartFn: fn
	      });
	      err.operator = fn.name;
	      throw err;
	    }

	    var keys = Object.keys(expected); // Special handle errors to make sure the name and the message are compared
	    // as well.

	    if (expected instanceof Error) {
	      keys.push('name', 'message');
	    } else if (keys.length === 0) {
	      throw new ERR_INVALID_ARG_VALUE('error', expected, 'may not be an empty object');
	    }

	    if (isDeepEqual === undefined) lazyLoadComparison();
	    keys.forEach(function (key) {
	      if (typeof actual[key] === 'string' && isRegExp(expected[key]) && expected[key].test(actual[key])) {
	        return;
	      }

	      compareExceptionKey(actual, expected, key, msg, keys, fn);
	    });
	    return true;
	  } // Guard instanceof against arrow functions as they don't have a prototype.


	  if (expected.prototype !== undefined && actual instanceof expected) {
	    return true;
	  }

	  if (Error.isPrototypeOf(expected)) {
	    return false;
	  }

	  return expected.call({}, actual) === true;
	}

	function getActual(fn) {
	  if (typeof fn !== 'function') {
	    throw new ERR_INVALID_ARG_TYPE('fn', 'Function', fn);
	  }

	  try {
	    fn();
	  } catch (e) {
	    return e;
	  }

	  return NO_EXCEPTION_SENTINEL;
	}

	function checkIsPromise(obj) {
	  // Accept native ES6 promises and promises that are implemented in a similar
	  // way. Do not accept thenables that use a function as `obj` and that have no
	  // `catch` handler.
	  // TODO: thenables are checked up until they have the correct methods,
	  // but according to documentation, the `then` method should receive
	  // the `fulfill` and `reject` arguments as well or it may be never resolved.
	  return isPromise(obj) || obj !== null && _typeof(obj) === 'object' && typeof obj.then === 'function' && typeof obj.catch === 'function';
	}

	function waitForActual(promiseFn) {
	  return Promise.resolve().then(function () {
	    var resultPromise;

	    if (typeof promiseFn === 'function') {
	      // Return a rejected promise if `promiseFn` throws synchronously.
	      resultPromise = promiseFn(); // Fail in case no promise is returned.

	      if (!checkIsPromise(resultPromise)) {
	        throw new ERR_INVALID_RETURN_VALUE('instance of Promise', 'promiseFn', resultPromise);
	      }
	    } else if (checkIsPromise(promiseFn)) {
	      resultPromise = promiseFn;
	    } else {
	      throw new ERR_INVALID_ARG_TYPE('promiseFn', ['Function', 'Promise'], promiseFn);
	    }

	    return Promise.resolve().then(function () {
	      return resultPromise;
	    }).then(function () {
	      return NO_EXCEPTION_SENTINEL;
	    }).catch(function (e) {
	      return e;
	    });
	  });
	}

	function expectsError(stackStartFn, actual, error, message) {
	  if (typeof error === 'string') {
	    if (arguments.length === 4) {
	      throw new ERR_INVALID_ARG_TYPE('error', ['Object', 'Error', 'Function', 'RegExp'], error);
	    }

	    if (_typeof(actual) === 'object' && actual !== null) {
	      if (actual.message === error) {
	        throw new ERR_AMBIGUOUS_ARGUMENT('error/message', "The error message \"".concat(actual.message, "\" is identical to the message."));
	      }
	    } else if (actual === error) {
	      throw new ERR_AMBIGUOUS_ARGUMENT('error/message', "The error \"".concat(actual, "\" is identical to the message."));
	    }

	    message = error;
	    error = undefined;
	  } else if (error != null && _typeof(error) !== 'object' && typeof error !== 'function') {
	    throw new ERR_INVALID_ARG_TYPE('error', ['Object', 'Error', 'Function', 'RegExp'], error);
	  }

	  if (actual === NO_EXCEPTION_SENTINEL) {
	    var details = '';

	    if (error && error.name) {
	      details += " (".concat(error.name, ")");
	    }

	    details += message ? ": ".concat(message) : '.';
	    var fnType = stackStartFn.name === 'rejects' ? 'rejection' : 'exception';
	    innerFail({
	      actual: undefined,
	      expected: error,
	      operator: stackStartFn.name,
	      message: "Missing expected ".concat(fnType).concat(details),
	      stackStartFn: stackStartFn
	    });
	  }

	  if (error && !expectedException(actual, error, message, stackStartFn)) {
	    throw actual;
	  }
	}

	function expectsNoError(stackStartFn, actual, error, message) {
	  if (actual === NO_EXCEPTION_SENTINEL) return;

	  if (typeof error === 'string') {
	    message = error;
	    error = undefined;
	  }

	  if (!error || expectedException(actual, error)) {
	    var details = message ? ": ".concat(message) : '.';
	    var fnType = stackStartFn.name === 'doesNotReject' ? 'rejection' : 'exception';
	    innerFail({
	      actual: actual,
	      expected: error,
	      operator: stackStartFn.name,
	      message: "Got unwanted ".concat(fnType).concat(details, "\n") + "Actual message: \"".concat(actual && actual.message, "\""),
	      stackStartFn: stackStartFn
	    });
	  }

	  throw actual;
	}

	assert.throws = function throws(promiseFn) {
	  for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
	    args[_key2 - 1] = arguments[_key2];
	  }

	  expectsError.apply(void 0, [throws, getActual(promiseFn)].concat(args));
	};

	assert.rejects = function rejects(promiseFn) {
	  for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
	    args[_key3 - 1] = arguments[_key3];
	  }

	  return waitForActual(promiseFn).then(function (result) {
	    return expectsError.apply(void 0, [rejects, result].concat(args));
	  });
	};

	assert.doesNotThrow = function doesNotThrow(fn) {
	  for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
	    args[_key4 - 1] = arguments[_key4];
	  }

	  expectsNoError.apply(void 0, [doesNotThrow, getActual(fn)].concat(args));
	};

	assert.doesNotReject = function doesNotReject(fn) {
	  for (var _len5 = arguments.length, args = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
	    args[_key5 - 1] = arguments[_key5];
	  }

	  return waitForActual(fn).then(function (result) {
	    return expectsNoError.apply(void 0, [doesNotReject, result].concat(args));
	  });
	};

	assert.ifError = function ifError(err) {
	  if (err !== null && err !== undefined) {
	    var message = 'ifError got unwanted exception: ';

	    if (_typeof(err) === 'object' && typeof err.message === 'string') {
	      if (err.message.length === 0 && err.constructor) {
	        message += err.constructor.name;
	      } else {
	        message += err.message;
	      }
	    } else {
	      message += inspect(err);
	    }

	    var newErr = new assertion_error({
	      actual: err,
	      expected: null,
	      operator: 'ifError',
	      message: message,
	      stackStartFn: ifError
	    }); // Make sure we actually have a stack trace!

	    var origStack = err.stack;

	    if (typeof origStack === 'string') {
	      // This will remove any duplicated frames from the error frames taken
	      // from within `ifError` and add the original error frames to the newly
	      // created ones.
	      var tmp2 = origStack.split('\n');
	      tmp2.shift(); // Filter all frames existing in err.stack.

	      var tmp1 = newErr.stack.split('\n');

	      for (var i = 0; i < tmp2.length; i++) {
	        // Find the first occurrence of the frame.
	        var pos = tmp1.indexOf(tmp2[i]);

	        if (pos !== -1) {
	          // Only keep new frames.
	          tmp1 = tmp1.slice(0, pos);
	          break;
	        }
	      }

	      newErr.stack = "".concat(tmp1.join('\n'), "\n").concat(tmp2.join('\n'));
	    }

	    throw newErr;
	  }
	}; // Expose a strict only variant of assert


	function strict() {
	  for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
	    args[_key6] = arguments[_key6];
	  }

	  innerOk.apply(void 0, [strict, args.length].concat(args));
	}

	assert.strict = objectAssign(strict, assert, {
	  equal: assert.strictEqual,
	  deepEqual: assert.deepStrictEqual,
	  notEqual: assert.notStrictEqual,
	  notDeepEqual: assert.notDeepStrictEqual
	});
	assert.strict.strict = assert.strict;
	});

	const validator = function (meta) {
	  try {
	    return Promise.resolve(mapToUniPort(meta)).then(function (proteins) {
	      assert_1.strict.notEqual(proteins.length, 0); //if no entries found then input does not correspond to a protein in UniProt

	      return meta;
	    });
	  } catch (e) {
	    return Promise.reject(e);
	  }
	};

	const mapToUniPort = function (meta) {
	  try {
	    const {
	      tissue,
	      anatomy
	    } = meta;
	    const url = `https://www.ebi.ac.uk/ols/api/select?q=${anatomy}`;
	    return Promise.resolve(fetch(url, {
	      method: 'GET',
	      headers: {
	        'Accept': 'application/json'
	      }
	    })).then(function (_fetch) {
	      return Promise.resolve(_fetch.json()).then(function ({
	        response
	      }) {
	        return response.docs.filter(r => r.obo_id === anatomy && r.label === tissue);
	      });
	    });
	  } catch (e) {
	    return Promise.reject(e);
	  }
	};

	return validator;

})));
//# sourceMappingURL=ontology.umd.js.map
