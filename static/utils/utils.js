'use strict';
//utils
const Utils = {
	/**@this {HTMLElement} */
	copyText() {
		const _this = this;
		const isHTMLElement = _this instanceof HTMLElement;
		const isHTMLInputElement = _this instanceof HTMLInputElement;
		const isHTMLTextAreaElement = _this instanceof HTMLTextAreaElement;
		let data = '';
		if (isHTMLInputElement || isHTMLTextAreaElement) {
			_this.focus();
			_this.select();
			data = _this.value;
		} else if (isHTMLElement) {
			const selection = self.getSelection();
			const range = document.createRange();
			range.selectNodeContents(_this);
			selection.removeAllRanges();
			selection.addRange(range);
			data = _this.textContent;
		} else return Promise.reject();
		if (navigator.clipboard) return navigator.clipboard.writeText(data);
		return Promise[document.execCommand('copy') ? 'resolve' : 'reject']();
	},
	/**@this {HTMLElement} */
	setText(str = '') {
		const _this = this;
		const isHTMLElement = _this instanceof HTMLElement;
		const isHTMLInputElement = _this instanceof HTMLInputElement;
		const isHTMLTextAreaElement = _this instanceof HTMLTextAreaElement;
		if (isHTMLInputElement || isHTMLTextAreaElement)(_this.value) = str;
		else if (isHTMLElement)(_this.textContent) = str;
		else return Promise.reject();
		return Promise.resolve();
	},
	cnymd(time) {
		const d = new Date(time * 1e3);
		return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
	},
	loadJS: str => new Promise(resolve => {
		const script = document.createElement('script');
		script.onload = resolve;
		script.onerror = resolve;
		try {
			const url = new URL(str);
			script.src = url.href;
			script.crossOrigin = 'anonymous';
		} catch (_) {
			script.textContent = String(str);
		}
		document.head.appendChild(script);
	}),
	lazyload(func, ...args) {
		if (document.readyState === 'complete') return func(...args);
		return new Promise(resolve => {
			const listener = () => {
				self.removeEventListener('load', listener);
				resolve(func(...args));
			};
			self.addEventListener('load', listener);
		});
	},
	/**@param {string} str */
	escapeHTML(str) {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;');
	},
	/**@type {(familyName:string,{...options}?:{})=>Promise<void>} */
	addFont() {}
};
//font
(function() {
	const fontLoader = {
		load(familyName, { ...options } = {}) {
			const fn = String(familyName).replace('+', ' ');
			const alt = options.alt != null ? String(options.alt) : fn;
			if (!fn) throw new SyntaxError('Missing family name');
			// const i0 = /[^\w ]/.exec(fn);
			// if (i0) throw new SyntaxError(`Invalid character '${i0[0]}' at position ${i0.index}`);
			const sarr = ['MyBaomitu', 'Local'];
			return new Promise((resolve, reject) => {
				let index = sarr.length;
				const err = new DOMException('The requested font families are not available.', 'Missing font family');
				for (let i of sarr.map(i => this.loadFonts(fn, { alt, from: i }))) {
					Promise.resolve(i).then(resolve, _ => !--index && reject(err)); //promise-any polyfill
				}
			});
		},
		async loadFonts(familyName, { ...options } = {}) {
			const from = options.from != null ? String(options.from) : 'Unknown';
			const alt = options.alt != null ? String(options.alt) : familyName;
			const csst = await this.getFonts(familyName, { alt, from }).catch(_ => []);
			return new Promise((resolve, reject) => {
				Promise.all(csst.map(a => a.load())).then(a => {
					if (!a.length) return reject();
					resolve(Object.assign(a, { qwq: from }));
				}, reject);
			});
		},
		async getFonts(name = 'Noto Sans SC', { ...options } = {}) {
			const style = options.style != null ? String(options.style) : 'Normal';
			const weight = options.weight != null ? String(options.weight) : 'Regular';
			const from = options.from != null ? String(options.from) : 'Unknown';
			const alt = options.alt != null ? String(options.alt) : name;
			const fn = name.replace('+', ' ');
			const sn = style.replace('+', ' ');
			const wn = weight.replace('+', ' ');
			if (!fn) throw new SyntaxError('Missing family name');
			const f1 = fn.toLocaleLowerCase().split(' ').join('-');
			const f2 = fn.replace(' ', '');
			const f3 = fn.split(' ').join('+');
			const s1 = sn.toLocaleLowerCase();
			const w1 = wn.toLocaleLowerCase();
			// const d0 = str => `@font-face{font-family:'${fn}';font-style:${s1};font-weight:${w1};${str}}`; // declaration
			switch (from) {
				case 'Google': {
					const u0 = `//fonts.googleapis.com/css?family=${f3}:${w1}${s1 === 'italic' ? 'i' : ''}`;
					// const u1 = `//fonts.googleapis.com/css2?family=${f3}&display=swap`;
					const text = await fetch(u0).then(a => a.text(), _ => '');
					const rg0 = (text.match(/{.+?}/gs) || []).map(a => a.slice(1, -1)); //Safari不支持(?<=)
					const rg = rg0.map(a => Object.fromEntries(a.split(';').filter(a => a.trim()).map(a => a.split(': ').map(a => a.trim()))));
					return rg.map(a => new FontFace(alt || a['font-family'], a.src, {
						style: a['font-style'],
						weight: a['font-weight'],
						// stretch: a['font-stretch'],
						unicodeRange: a['unicode-range'],
						// variant: a['font-variant'],
						// featureSettings: a['font-feature-settings'],
						// display: a['font-display'],
					}));
				}
				case 'MyBaomitu': {
					const u0 = `/static/assets/${f1}-${w1}`;
					const source = [ //
						`url('${u0}.woff2')format('woff2')`, // Super Modern Browsers
						`url('${u0}.woff')format('woff')`, // Modern Browsers
						`url('${u0}.ttf')format('truetype')`, // Safari, Android, iOS
					]
					return [new FontFace(alt, source.join())]; //以后添加descriptors支持
				}
				case 'Local': {
					return [new FontFace(alt, `local('${fn}'),local('${f2}-${sn}')`)];
				}
				default:
					return [];
			}
		}
	};
	Utils.addFont = (...args) => fontLoader.load(...args).then(i => i.forEach(a => document.fonts.add(a)));
	//Utils.addFont('Noto Sans SC').catch(_ => '');
})();
//fuck safe
{
	let percent = 0;
	const _ = localStorage;
	if (_.setItem == 'function (a,b){}') {
		delete _.setItem;
		// Object.defineProperty(_, 'setItem', { value: function(a, b) { _[a] = b } });
		percent += 20;
	}
	if (_.getItem == 'function (a){return null}') {
		delete _.getItem;
		// Object.defineProperty(_, 'getItem', { value: function(a) { return _[a] } });
		percent += 20;
	}
	if (_.removeItem == 'function (a){}') {
		delete _.removeItem;
		// Object.defineProperty(_, 'removeItem', { value: function(a) { delete _[a] } });
		percent += 20;
	}
	if (_.clear == 'function (){}') {
		delete _.clear;
		// Object.defineProperty(_, 'removeItem', { value: function() { Object.keys(_).forEach(v => delete _[v]) } });
		percent += 20;
	}
	if (_.key == 'function (a){return null}') {
		delete _.key;
		// Object.defineProperty(_, 'key', { value: function(a) { return Object.keys(_)[a] } });
		percent += 20;
	}
	self.isIncognito = percent;
}

Utils.lazyload(function() {
	const isStandAlone = navigator.standalone || self.matchMedia('(display-mode: standalone)').matches;
	for (const i of document.querySelectorAll('.main')) i.style.display = 'block';
});