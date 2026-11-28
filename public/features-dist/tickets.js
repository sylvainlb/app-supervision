// ../app-store/node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t3, e4, o5) {
    if (this._$cssResult$ = true, o5 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t3, this.t = e4;
  }
  get styleSheet() {
    let t3 = this.o;
    const s5 = this.t;
    if (e && void 0 === t3) {
      const e4 = void 0 !== s5 && 1 === s5.length;
      e4 && (t3 = o.get(s5)), void 0 === t3 && ((this.o = t3 = new CSSStyleSheet()).replaceSync(this.cssText), e4 && o.set(s5, t3));
    }
    return t3;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t3) => new n("string" == typeof t3 ? t3 : t3 + "", void 0, s);
var i = (t3, ...e4) => {
  const o5 = 1 === t3.length ? t3[0] : e4.reduce((e5, s5, o6) => e5 + ((t4) => {
    if (true === t4._$cssResult$) return t4.cssText;
    if ("number" == typeof t4) return t4;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t4 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t3[o6 + 1], t3[0]);
  return new n(o5, t3, s);
};
var S = (s5, o5) => {
  if (e) s5.adoptedStyleSheets = o5.map((t3) => t3 instanceof CSSStyleSheet ? t3 : t3.styleSheet);
  else for (const e4 of o5) {
    const o6 = document.createElement("style"), n4 = t.litNonce;
    void 0 !== n4 && o6.setAttribute("nonce", n4), o6.textContent = e4.cssText, s5.appendChild(o6);
  }
};
var c = e ? (t3) => t3 : (t3) => t3 instanceof CSSStyleSheet ? ((t4) => {
  let e4 = "";
  for (const s5 of t4.cssRules) e4 += s5.cssText;
  return r(e4);
})(t3) : t3;

// ../app-store/node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t3, s5) => t3;
var u = { toAttribute(t3, s5) {
  switch (s5) {
    case Boolean:
      t3 = t3 ? l : null;
      break;
    case Object:
    case Array:
      t3 = null == t3 ? t3 : JSON.stringify(t3);
  }
  return t3;
}, fromAttribute(t3, s5) {
  let i6 = t3;
  switch (s5) {
    case Boolean:
      i6 = null !== t3;
      break;
    case Number:
      i6 = null === t3 ? null : Number(t3);
      break;
    case Object:
    case Array:
      try {
        i6 = JSON.parse(t3);
      } catch (t4) {
        i6 = null;
      }
  }
  return i6;
} };
var f = (t3, s5) => !i2(t3, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t3) {
    this._$Ei(), (this.l ??= []).push(t3);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t3, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t3) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t3, s5), !s5.noAccessor) {
      const i6 = Symbol(), h4 = this.getPropertyDescriptor(t3, i6, s5);
      void 0 !== h4 && e2(this.prototype, t3, h4);
    }
  }
  static getPropertyDescriptor(t3, s5, i6) {
    const { get: e4, set: r5 } = h(this.prototype, t3) ?? { get() {
      return this[s5];
    }, set(t4) {
      this[s5] = t4;
    } };
    return { get: e4, set(s6) {
      const h4 = e4?.call(this);
      r5?.call(this, s6), this.requestUpdate(t3, h4, i6);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t3) {
    return this.elementProperties.get(t3) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t3 = n2(this);
    t3.finalize(), void 0 !== t3.l && (this.l = [...t3.l]), this.elementProperties = new Map(t3.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t4 = this.properties, s5 = [...r2(t4), ...o2(t4)];
      for (const i6 of s5) this.createProperty(i6, t4[i6]);
    }
    const t3 = this[Symbol.metadata];
    if (null !== t3) {
      const s5 = litPropertyMetadata.get(t3);
      if (void 0 !== s5) for (const [t4, i6] of s5) this.elementProperties.set(t4, i6);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t4, s5] of this.elementProperties) {
      const i6 = this._$Eu(t4, s5);
      void 0 !== i6 && this._$Eh.set(i6, t4);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i6 = [];
    if (Array.isArray(s5)) {
      const e4 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e4) i6.unshift(c(s6));
    } else void 0 !== s5 && i6.push(c(s5));
    return i6;
  }
  static _$Eu(t3, s5) {
    const i6 = s5.attribute;
    return false === i6 ? void 0 : "string" == typeof i6 ? i6 : "string" == typeof t3 ? t3.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t3) => this.enableUpdating = t3), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t3) => t3(this));
  }
  addController(t3) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t3), void 0 !== this.renderRoot && this.isConnected && t3.hostConnected?.();
  }
  removeController(t3) {
    this._$EO?.delete(t3);
  }
  _$E_() {
    const t3 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i6 of s5.keys()) this.hasOwnProperty(i6) && (t3.set(i6, this[i6]), delete this[i6]);
    t3.size > 0 && (this._$Ep = t3);
  }
  createRenderRoot() {
    const t3 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t3, this.constructor.elementStyles), t3;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t3) => t3.hostConnected?.());
  }
  enableUpdating(t3) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t3) => t3.hostDisconnected?.());
  }
  attributeChangedCallback(t3, s5, i6) {
    this._$AK(t3, i6);
  }
  _$ET(t3, s5) {
    const i6 = this.constructor.elementProperties.get(t3), e4 = this.constructor._$Eu(t3, i6);
    if (void 0 !== e4 && true === i6.reflect) {
      const h4 = (void 0 !== i6.converter?.toAttribute ? i6.converter : u).toAttribute(s5, i6.type);
      this._$Em = t3, null == h4 ? this.removeAttribute(e4) : this.setAttribute(e4, h4), this._$Em = null;
    }
  }
  _$AK(t3, s5) {
    const i6 = this.constructor, e4 = i6._$Eh.get(t3);
    if (void 0 !== e4 && this._$Em !== e4) {
      const t4 = i6.getPropertyOptions(e4), h4 = "function" == typeof t4.converter ? { fromAttribute: t4.converter } : void 0 !== t4.converter?.fromAttribute ? t4.converter : u;
      this._$Em = e4;
      const r5 = h4.fromAttribute(s5, t4.type);
      this[e4] = r5 ?? this._$Ej?.get(e4) ?? r5, this._$Em = null;
    }
  }
  requestUpdate(t3, s5, i6, e4 = false, h4) {
    if (void 0 !== t3) {
      const r5 = this.constructor;
      if (false === e4 && (h4 = this[t3]), i6 ??= r5.getPropertyOptions(t3), !((i6.hasChanged ?? f)(h4, s5) || i6.useDefault && i6.reflect && h4 === this._$Ej?.get(t3) && !this.hasAttribute(r5._$Eu(t3, i6)))) return;
      this.C(t3, s5, i6);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t3, s5, { useDefault: i6, reflect: e4, wrapped: h4 }, r5) {
    i6 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t3) && (this._$Ej.set(t3, r5 ?? s5 ?? this[t3]), true !== h4 || void 0 !== r5) || (this._$AL.has(t3) || (this.hasUpdated || i6 || (s5 = void 0), this._$AL.set(t3, s5)), true === e4 && this._$Em !== t3 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t3));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t4) {
      Promise.reject(t4);
    }
    const t3 = this.scheduleUpdate();
    return null != t3 && await t3, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t5, s6] of this._$Ep) this[t5] = s6;
        this._$Ep = void 0;
      }
      const t4 = this.constructor.elementProperties;
      if (t4.size > 0) for (const [s6, i6] of t4) {
        const { wrapped: t5 } = i6, e4 = this[s6];
        true !== t5 || this._$AL.has(s6) || void 0 === e4 || this.C(s6, void 0, i6, e4);
      }
    }
    let t3 = false;
    const s5 = this._$AL;
    try {
      t3 = this.shouldUpdate(s5), t3 ? (this.willUpdate(s5), this._$EO?.forEach((t4) => t4.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t3 = false, this._$EM(), s6;
    }
    t3 && this._$AE(s5);
  }
  willUpdate(t3) {
  }
  _$AE(t3) {
    this._$EO?.forEach((t4) => t4.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t3)), this.updated(t3);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t3) {
    return true;
  }
  update(t3) {
    this._$Eq &&= this._$Eq.forEach((t4) => this._$ET(t4, this[t4])), this._$EM();
  }
  updated(t3) {
  }
  firstUpdated(t3) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// ../app-store/node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t3) => t3;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t3) => t3 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t3) => null === t3 || "object" != typeof t3 && "function" != typeof t3;
var u2 = Array.isArray;
var d2 = (t3) => u2(t3) || "function" == typeof t3?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t3) => (i6, ...s5) => ({ _$litType$: t3, strings: i6, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = Symbol.for("lit-noChange");
var A = Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t3, i6) {
  if (!u2(t3) || !t3.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i6) : i6;
}
var N = (t3, i6) => {
  const s5 = t3.length - 1, e4 = [];
  let n4, l3 = 2 === i6 ? "<svg>" : 3 === i6 ? "<math>" : "", c4 = v;
  for (let i7 = 0; i7 < s5; i7++) {
    const s6 = t3[i7];
    let a3, u3, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c4.lastIndex = f3, u3 = c4.exec(s6), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n4 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n4 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a3 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n4 = void 0);
    const x2 = c4 === p2 && t3[i7 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s6 + r3 : d3 >= 0 ? (e4.push(a3), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i7 : x2);
  }
  return [V(t3, l3 + (t3[s5] || "<?>") + (2 === i6 ? "</svg>" : 3 === i6 ? "</math>" : "")), e4];
};
var S2 = class _S {
  constructor({ strings: t3, _$litType$: i6 }, e4) {
    let r5;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u3 = t3.length - 1, d3 = this.parts, [f3, v2] = N(t3, i6);
    if (this.el = _S.createElement(f3, e4), P.currentNode = this.el.content, 2 === i6 || 3 === i6) {
      const t4 = this.el.content.firstChild;
      t4.replaceWith(...t4.childNodes);
    }
    for (; null !== (r5 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r5.nodeType) {
        if (r5.hasAttributes()) for (const t4 of r5.getAttributeNames()) if (t4.endsWith(h2)) {
          const i7 = v2[a3++], s5 = r5.getAttribute(t4).split(o3), e5 = /([.?@])?(.*)/.exec(i7);
          d3.push({ type: 1, index: l3, name: e5[2], strings: s5, ctor: "." === e5[1] ? I : "?" === e5[1] ? L : "@" === e5[1] ? z : H }), r5.removeAttribute(t4);
        } else t4.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r5.removeAttribute(t4));
        if (y2.test(r5.tagName)) {
          const t4 = r5.textContent.split(o3), i7 = t4.length - 1;
          if (i7 > 0) {
            r5.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i7; s5++) r5.append(t4[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r5.append(t4[i7], c3());
          }
        }
      } else if (8 === r5.nodeType) if (r5.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t4 = -1;
        for (; -1 !== (t4 = r5.data.indexOf(o3, t4 + 1)); ) d3.push({ type: 7, index: l3 }), t4 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t3, i6) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t3, s5;
  }
};
function M(t3, i6, s5 = t3, e4) {
  if (i6 === E) return i6;
  let h4 = void 0 !== e4 ? s5._$Co?.[e4] : s5._$Cl;
  const o5 = a2(i6) ? void 0 : i6._$litDirective$;
  return h4?.constructor !== o5 && (h4?._$AO?.(false), void 0 === o5 ? h4 = void 0 : (h4 = new o5(t3), h4._$AT(t3, s5, e4)), void 0 !== e4 ? (s5._$Co ??= [])[e4] = h4 : s5._$Cl = h4), void 0 !== h4 && (i6 = M(t3, h4._$AS(t3, i6.values), h4, e4)), i6;
}
var R = class {
  constructor(t3, i6) {
    this._$AV = [], this._$AN = void 0, this._$AD = t3, this._$AM = i6;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t3) {
    const { el: { content: i6 }, parts: s5 } = this._$AD, e4 = (t3?.creationScope ?? l2).importNode(i6, true);
    P.currentNode = e4;
    let h4 = P.nextNode(), o5 = 0, n4 = 0, r5 = s5[0];
    for (; void 0 !== r5; ) {
      if (o5 === r5.index) {
        let i7;
        2 === r5.type ? i7 = new k(h4, h4.nextSibling, this, t3) : 1 === r5.type ? i7 = new r5.ctor(h4, r5.name, r5.strings, this, t3) : 6 === r5.type && (i7 = new Z(h4, this, t3)), this._$AV.push(i7), r5 = s5[++n4];
      }
      o5 !== r5?.index && (h4 = P.nextNode(), o5++);
    }
    return P.currentNode = l2, e4;
  }
  p(t3) {
    let i6 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t3, s5, i6), i6 += s5.strings.length - 2) : s5._$AI(t3[i6])), i6++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t3, i6, s5, e4) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t3, this._$AB = i6, this._$AM = s5, this.options = e4, this._$Cv = e4?.isConnected ?? true;
  }
  get parentNode() {
    let t3 = this._$AA.parentNode;
    const i6 = this._$AM;
    return void 0 !== i6 && 11 === t3?.nodeType && (t3 = i6.parentNode), t3;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t3, i6 = this) {
    t3 = M(this, t3, i6), a2(t3) ? t3 === A || null == t3 || "" === t3 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t3 !== this._$AH && t3 !== E && this._(t3) : void 0 !== t3._$litType$ ? this.$(t3) : void 0 !== t3.nodeType ? this.T(t3) : d2(t3) ? this.k(t3) : this._(t3);
  }
  O(t3) {
    return this._$AA.parentNode.insertBefore(t3, this._$AB);
  }
  T(t3) {
    this._$AH !== t3 && (this._$AR(), this._$AH = this.O(t3));
  }
  _(t3) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t3 : this.T(l2.createTextNode(t3)), this._$AH = t3;
  }
  $(t3) {
    const { values: i6, _$litType$: s5 } = t3, e4 = "number" == typeof s5 ? this._$AC(t3) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e4) this._$AH.p(i6);
    else {
      const t4 = new R(e4, this), s6 = t4.u(this.options);
      t4.p(i6), this.T(s6), this._$AH = t4;
    }
  }
  _$AC(t3) {
    let i6 = C.get(t3.strings);
    return void 0 === i6 && C.set(t3.strings, i6 = new S2(t3)), i6;
  }
  k(t3) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i6 = this._$AH;
    let s5, e4 = 0;
    for (const h4 of t3) e4 === i6.length ? i6.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i6[e4], s5._$AI(h4), e4++;
    e4 < i6.length && (this._$AR(s5 && s5._$AB.nextSibling, e4), i6.length = e4);
  }
  _$AR(t3 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t3 !== this._$AB; ) {
      const s6 = i3(t3).nextSibling;
      i3(t3).remove(), t3 = s6;
    }
  }
  setConnected(t3) {
    void 0 === this._$AM && (this._$Cv = t3, this._$AP?.(t3));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t3, i6, s5, e4, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t3, this.name = i6, this._$AM = e4, this.options = h4, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t3, i6 = this, s5, e4) {
    const h4 = this.strings;
    let o5 = false;
    if (void 0 === h4) t3 = M(this, t3, i6, 0), o5 = !a2(t3) || t3 !== this._$AH && t3 !== E, o5 && (this._$AH = t3);
    else {
      const e5 = t3;
      let n4, r5;
      for (t3 = h4[0], n4 = 0; n4 < h4.length - 1; n4++) r5 = M(this, e5[s5 + n4], i6, n4), r5 === E && (r5 = this._$AH[n4]), o5 ||= !a2(r5) || r5 !== this._$AH[n4], r5 === A ? t3 = A : t3 !== A && (t3 += (r5 ?? "") + h4[n4 + 1]), this._$AH[n4] = r5;
    }
    o5 && !e4 && this.j(t3);
  }
  j(t3) {
    t3 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t3 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t3) {
    this.element[this.name] = t3 === A ? void 0 : t3;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t3) {
    this.element.toggleAttribute(this.name, !!t3 && t3 !== A);
  }
};
var z = class extends H {
  constructor(t3, i6, s5, e4, h4) {
    super(t3, i6, s5, e4, h4), this.type = 5;
  }
  _$AI(t3, i6 = this) {
    if ((t3 = M(this, t3, i6, 0) ?? A) === E) return;
    const s5 = this._$AH, e4 = t3 === A && s5 !== A || t3.capture !== s5.capture || t3.once !== s5.once || t3.passive !== s5.passive, h4 = t3 !== A && (s5 === A || e4);
    e4 && this.element.removeEventListener(this.name, this, s5), h4 && this.element.addEventListener(this.name, this, t3), this._$AH = t3;
  }
  handleEvent(t3) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t3) : this._$AH.handleEvent(t3);
  }
};
var Z = class {
  constructor(t3, i6, s5) {
    this.element = t3, this.type = 6, this._$AN = void 0, this._$AM = i6, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t3) {
    M(this, t3);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t3, i6, s5) => {
  const e4 = s5?.renderBefore ?? i6;
  let h4 = e4._$litPart$;
  if (void 0 === h4) {
    const t4 = s5?.renderBefore ?? null;
    e4._$litPart$ = h4 = new k(i6.insertBefore(c3(), t4), t4, void 0, s5 ?? {});
  }
  return h4._$AI(t3), h4;
};

// ../app-store/node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t3 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t3.firstChild, t3;
  }
  update(t3) {
    const r5 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t3), this._$Do = D(r5, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// ../app-store/node_modules/@lit/task/task.js
var i5 = Symbol();
var h3 = class {
  get taskComplete() {
    return this.t || (1 === this.i ? this.t = new Promise((t3, s5) => {
      this.o = t3, this.h = s5;
    }) : 3 === this.i ? this.t = Promise.reject(this.l) : this.t = Promise.resolve(this.u)), this.t;
  }
  constructor(t3, s5, i6) {
    this.p = 0, this.i = 0, (this._ = t3).addController(this);
    const h4 = "object" == typeof s5 ? s5 : { task: s5, args: i6 };
    this.v = h4.task, this.j = h4.args, this.m = h4.argsEqual ?? r4, this.k = h4.onComplete, this.A = h4.onError, this.autoRun = h4.autoRun ?? true, "initialValue" in h4 && (this.u = h4.initialValue, this.i = 2, this.O = this.T?.());
  }
  hostUpdate() {
    true === this.autoRun && this.S();
  }
  hostUpdated() {
    "afterUpdate" === this.autoRun && this.S();
  }
  T() {
    if (void 0 === this.j) return;
    const t3 = this.j();
    if (!Array.isArray(t3)) throw Error("The args function must return an array");
    return t3;
  }
  async S() {
    const t3 = this.T(), s5 = this.O;
    this.O = t3, t3 === s5 || void 0 === t3 || void 0 !== s5 && this.m(s5, t3) || await this.run(t3);
  }
  async run(t3) {
    let s5, h4;
    t3 ??= this.T(), this.O = t3, 1 === this.i ? this.q?.abort() : (this.t = void 0, this.o = void 0, this.h = void 0), this.i = 1, "afterUpdate" === this.autoRun ? queueMicrotask(() => this._.requestUpdate()) : this._.requestUpdate();
    const r5 = ++this.p;
    this.q = new AbortController();
    let e4 = false;
    try {
      s5 = await this.v(t3, { signal: this.q.signal });
    } catch (t4) {
      e4 = true, h4 = t4;
    }
    if (this.p === r5) {
      if (s5 === i5) this.i = 0;
      else {
        if (false === e4) {
          try {
            this.k?.(s5);
          } catch {
          }
          this.i = 2, this.o?.(s5);
        } else {
          try {
            this.A?.(h4);
          } catch {
          }
          this.i = 3, this.h?.(h4);
        }
        this.u = s5, this.l = h4;
      }
      this._.requestUpdate();
    }
  }
  abort(t3) {
    1 === this.i && this.q?.abort(t3);
  }
  get value() {
    return this.u;
  }
  get error() {
    return this.l;
  }
  get status() {
    return this.i;
  }
  render(t3) {
    switch (this.i) {
      case 0:
        return t3.initial?.();
      case 1:
        return t3.pending?.();
      case 2:
        return t3.complete?.(this.value);
      case 3:
        return t3.error?.(this.error);
      default:
        throw Error("Unexpected status: " + this.i);
    }
  }
};
var r4 = (s5, i6) => s5 === i6 || s5.length === i6.length && s5.every((s6, h4) => !f(s6, i6[h4]));

// ../app-store/components/boilerplate/index.js
async function getJson(url) {
  const fetchFn = window.sibStore?.fetchAuthn ?? fetch;
  const res = await fetchFn(url, { headers: { accept: "application/ld+json" } });
  if (!res.ok) {
    const err = new Error(`GET ${url} \u2192 ${res.status}`);
    err.status = res.status;
    try {
      err.body = await res.json();
    } catch {
    }
    throw err;
  }
  return res.json();
}
async function resolveMembers(data, { concurrency = 12 } = {}) {
  const members = data?.["ldp:contains"] ?? (Array.isArray(data) ? data : []);
  const out = new Array(members.length);
  let next = 0;
  const isStub = (m2) => m2 && typeof m2 === "object" && m2["@id"] && Object.keys(m2).filter((k2) => k2 !== "@id" && k2 !== "@type").length === 0;
  async function worker() {
    while (next < members.length) {
      const i6 = next++;
      const m2 = members[i6];
      if (isStub(m2)) {
        try {
          out[i6] = await getJson(m2["@id"]);
        } catch {
          out[i6] = m2;
        }
      } else {
        out[i6] = m2;
      }
    }
  }
  const n4 = Math.max(1, Math.min(concurrency, members.length));
  await Promise.all(Array.from({ length: n4 }, () => worker()));
  return out;
}
var sharedStyles = i`    :host {
    --brand: #10b981; --brand-light: #34d399; --brand-dark: #059669; --ink: #0f172a; --muted: #64748b;
    --border: #e5eaf0;
    --shadow: 0 1px 2px rgba(15,23,42,.05), 0 6px 18px rgba(15,23,42,.06);
    --shadow-lg: 0 4px 10px rgba(15,23,42,.07), 0 18px 44px rgba(15,23,42,.13);
    display: block; font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; }
    /* Reset box-sizing in the shadow root too: otherwise width:100% fields
       overflow their container (padding + border in content-box). */
    *, *::before, *::after { box-sizing: border-box; }
    /* Hand cursor on everything clickable (including <a> without href:
       the browser only sets pointer on links with href). */
    a, button, summary, [role="button"], [data-route], .clickable { cursor: pointer; }
    button {
      background: linear-gradient(135deg, var(--brand-light, #34d399), var(--brand, #10b981)); color: #064e3b; border: 0; border-radius: 10px;
      padding: 8px 16px; font-size: 0.9rem; font-weight: 700; cursor: pointer;
      box-shadow: 0 1px 3px rgba(16,185,129,.35);
      transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    }
    button:hover { filter: brightness(1.04); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,.45); }
    button:active { transform: translateY(0); }
    button.secondary { background: #fff; color: var(--ink, #0f172a); border: 1px solid var(--border, #e5eaf0); box-shadow: var(--shadow); }
    button.secondary:hover { background: #f3f4f6; box-shadow: var(--shadow-lg); }
    input, select, textarea {
      border: 1px solid var(--border, #e5eaf0); border-radius: 10px; padding: 8px 11px; font-size: 0.9rem;
      font-family: inherit; background: #fbfcfe; color: var(--ink, #0f172a);
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
    }
    input:focus, select:focus, textarea:focus {
      outline: none; border-color: var(--brand, #10b981); background: #fff;
      box-shadow: 0 0 0 3px rgba(52,211,153,.28);
    }
    table { border-collapse: separate; border-spacing: 0; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow); border: 1px solid var(--border, #e5eaf0); }
    th { background: #f8fafc; text-align: left; font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted, #64748b); }
    th, td { border-bottom: 1px solid var(--border, #e5eaf0); padding: 9px 13px; font-size: 0.9rem; }
    tr:last-child td { border-bottom: 0; }
    tbody tr { transition: background .12s ease; }
    tbody tr:hover { background: #ecfdf5; }
    .card { background: #fff; border: 1px solid var(--border, #e5eaf0); border-radius: 12px; box-shadow: var(--shadow); padding: 12px; transition: box-shadow .15s ease, transform .15s ease; }
    /* "Soft" badges: tinted background + colored text (more readable than solid fill) */
    .badge { display: inline-block; border-radius: 999px; padding: 3px 11px; font-size: 0.74rem; font-weight: 700; letter-spacing: .02em; color: #475569; background: #f1f5f9; }
    .sev-LOW, .st-OPEN { background: #e2e8f0; color: #475569; }
    .sev-MEDIUM, .pri-MEDIUM, .st-anomaly { background: #fef3c7; color: #b45309; }
    .sev-HIGH, .st-IN_PROGRESS, .pri-HIGH { background: #ffedd5; color: #c2410c; }
    .sev-CRITICAL, .pri-CRITICAL, .st-high { background: #fee2e2; color: #b91c1c; }
    .st-RESOLVED { background: #e0f2fe; color: #0369a1; }
    .st-CLOSED, .st-ok { background: #d1fae5; color: #047857; }
    .pending .skeleton { height: 1.2em; border-radius: 8px; background: linear-gradient(90deg, #e8edf3 25%, #f4f7fa 50%, #e8edf3 75%); background-size: 200% 100%; animation: pulse 1.2s infinite; }
    @keyframes pulse { to { background-position: -200% 0; } }
    .error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 10px; padding: 10px 14px; }
    .empty { border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 28px; text-align: center; color: var(--muted, #64748b); font-style: italic; background: #fff; }
    .toast { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; border-radius: 10px; padding: 10px 14px; margin: 8px 0; box-shadow: var(--shadow); }`;
var ComponentObjectHandler = class extends i4 {
  static properties = {
    dataSrc: { type: String, attribute: "data-src" },
    object: { type: Object, attribute: false }
  };
  constructor() {
    super();
    this.object = null;
  }
  // To override: predicate on the loaded resource.
  isType(_obj) {
    return true;
  }
};
var ComponentObjectsHandler = class extends ComponentObjectHandler {
  static properties = {
    ...ComponentObjectHandler.properties,
    objects: { type: Array, attribute: false }
  };
  constructor() {
    super();
    this.objects = [];
  }
  // To override: predicate on each container member.
  hasType(_obj) {
    return true;
  }
};
var OrbitComponent = class extends ComponentObjectsHandler {
  static properties = {
    ...ComponentObjectsHandler.properties,
    error: { type: Object, attribute: false }
  };
  static styles = sharedStyles;
  constructor() {
    super();
    this.error = null;
    this._task = new h3(this, {
      task: async () => this.load(),
      autoRun: false
    });
  }
  connectedCallback() {
    super.connectedCallback();
    this._onSave = () => this.refresh();
    document.addEventListener("save", this._onSave);
    const ready = window.orbit?.ready ?? new Promise((resolve) => document.addEventListener("orbit-ready", resolve, { once: true }));
    ready.then(() => this.refresh());
  }
  disconnectedCallback() {
    document.removeEventListener("save", this._onSave);
    super.disconnectedCallback();
  }
  // Load hook — to override. Feed this.object / this.objects.
  async load() {
    const data = await getJson(this.dataSrc);
    const resolved = await resolveMembers(data);
    this.objects = resolved.filter((m2) => this.hasType(m2));
    this.object = this.isType(data) ? data : null;
    return data;
  }
  refresh() {
    this._task.run();
  }
  navigate(route, resource = null, query = null) {
    document.dispatchEvent(new CustomEvent("requestNavigation", { detail: { route, resource, query } }));
  }
  // Explicit empty state (§7.1) — to override if the component feeds something other than objects/object.
  isEmpty() {
    return this.objects.length === 0 && !this.object;
  }
  render() {
    return this._task.render({
      initial: () => b2`<div class="pending" role="status"><div class="skeleton"></div></div>`,
      pending: () => b2`<div class="pending" role="status"><div class="skeleton"></div></div>`,
      error: (e4) => b2`<div class="error" role="alert">error: ${e4?.message ?? e4}</div>`,
      complete: () => this.isEmpty() ? b2`<div class="empty">no items</div>` : this.renderContent()
    });
  }
  // To override: content render once the data is loaded.
  renderContent() {
    return b2``;
  }
};

// src/lib/context.js
function field(obj, name) {
  if (!obj || typeof obj !== "object") return void 0;
  if (obj[name] !== void 0) return obj[name];
  for (const k2 of Object.keys(obj)) {
    if (k2.endsWith(":" + name)) return obj[k2];
  }
  return void 0;
}

// src/lib/transitions.js
var STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
var PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
var DEFAULT_PRIORITY = "MEDIUM";

// components/ticket-board/logic.js
var PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
function compareTickets(a3, b3) {
  const pa = PRIORITY_ORDER[field(a3, "priority") ?? DEFAULT_PRIORITY];
  const pb = PRIORITY_ORDER[field(b3, "priority") ?? DEFAULT_PRIORITY];
  if (pa !== pb) return pa - pb;
  return (field(b3, "created_at") ?? "").localeCompare(field(a3, "created_at") ?? "");
}
function groupByStatus(tickets) {
  const groups = Object.fromEntries(STATUSES.map((s5) => [s5, []]));
  for (const t3 of tickets ?? []) {
    if (t3 == null) continue;
    const status = field(t3, "status") ?? "OPEN";
    (groups[status] ??= []).push(t3);
  }
  for (const key of Object.keys(groups)) groups[key].sort(compareTickets);
  return groups;
}

// components/ticket-board/ticket-board.js
var STATUS_LABEL = { OPEN: "Open", IN_PROGRESS: "In progress", RESOLVED: "Resolved", CLOSED: "Closed" };
var TicketBoard = class extends OrbitComponent {
  static styles = i`
    ${OrbitComponent.styles}
    .board-head { display: flex; align-items: center; justify-content: flex-end; margin-bottom: 12px; }
    .board { display: flex; gap: 16px; align-items: flex-start; }
    .column {
      flex: 1; min-width: 0; background: #f6f8fb; border: 1px solid var(--border, #e5eaf0);
      border-radius: var(--radius, 14px); padding: 12px; box-shadow: var(--shadow);
    }
    .column h3 {
      margin: 0 0 10px; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
      color: var(--muted, #64748b); display: flex; justify-content: space-between; align-items: center;
      padding: 2px 4px 8px; border-bottom: 2px solid var(--border, #e5eaf0);
    }
    .column[data-status="OPEN"] h3 { color: #475569; border-bottom-color: #cbd5e1; }
    .column[data-status="IN_PROGRESS"] h3 { color: #c2410c; border-bottom-color: #fed7aa; }
    .column[data-status="RESOLVED"] h3 { color: #0369a1; border-bottom-color: #bae6fd; }
    .column[data-status="CLOSED"] h3 { color: #047857; border-bottom-color: #a7f3d0; }
    .count { background: #fff; color: var(--ink, #0f172a); border: 1px solid var(--border, #e5eaf0); border-radius: 999px; padding: 1px 10px; font-size: 0.76rem; font-weight: 700; box-shadow: var(--shadow); }
    .card {
      background: #fff; border: 1px solid var(--border, #e5eaf0); border-radius: 11px; margin: 9px 0; padding: 11px 12px;
      cursor: pointer; box-shadow: var(--shadow); font-size: 0.88rem;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    }
    .card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); border-color: #a7f3d0; }
    .card strong { font-weight: 600; line-height: 1.35; }
    .card .meta { color: var(--muted, #64748b); font-size: 0.77rem; margin-top: 7px; display: flex; gap: 8px; align-items: center; }
  `;
  constructor() {
    super();
    this.dataSrc = "/tickets/";
  }
  renderContent() {
    const groups = groupByStatus(this.objects);
    return b2`
      <div class="board-head">
        <button type="button" @click=${() => this.navigate("ticket-new", "/tickets/new")}>+ New ticket</button>
      </div>
      <div class="board">
        ${Object.entries(groups).map(([status, tickets]) => b2`
          <section class="column" data-status=${status}>
            <h3>${STATUS_LABEL[status] ?? status} <span class="count">${tickets.length}</span></h3>
            ${tickets.map((t3) => b2`
              <div class="card" @click=${() => this.navigate("ticket-detail", t3["@id"])}>
                <strong>${field(t3, "title")}</strong>
                <div class="meta">
                  <span class="badge pri-${field(t3, "priority") ?? "MEDIUM"}">${field(t3, "priority") ?? "MEDIUM"}</span>
                  <span>${(field(t3, "created_at") ?? "").slice(0, 19).replace("T", " ")}</span>
                </div>
              </div>`)}
          </section>`)}
      </div>`;
  }
};
customElements.define("ticket-board", TicketBoard);

// components/ticket-new/logic.js
function validateTicket({ title, building_id } = {}) {
  const errors = [];
  if (!title) errors.push("title required");
  if (!building_id) errors.push("building required (RG-1)");
  return errors;
}
function buildTicketPayload({ title, description, priority, building_id, anomaly_ref, created_by } = {}) {
  const payload = {
    title,
    description: description ?? "",
    priority: priority ?? DEFAULT_PRIORITY,
    building_id,
    created_by,
    status: "OPEN"
  };
  if (anomaly_ref) payload.anomaly_ref = anomaly_ref;
  return payload;
}

// components/ticket-new/ticket-new.js
var TicketNew = class extends i4 {
  static properties = {
    anomaly: { type: String },
    // @id of the anomaly (query ?anomaly=)
    buildings: { type: Array, attribute: false },
    form: { type: Object, attribute: false },
    errors: { type: Array, attribute: false },
    webid: { type: String }
  };
  static styles = i`
    ${sharedStyles}
    form { background: #fff; border: 1px solid var(--border, #e5eaf0); border-radius: var(--radius, 14px); box-shadow: var(--shadow); padding: 20px 22px; max-width: 520px; }
    /* clean vertical grid: label above, full-width field below */
    form label { display: grid; gap: 6px; margin: 0 0 14px; font-size: 0.86rem; font-weight: 600; color: #334155; }
    form input, form select, form textarea { width: 100%; }
    form textarea { min-height: 96px; resize: vertical; }
    form select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%); background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%; background-size: 5px 5px; background-repeat: no-repeat; padding-right: 32px; }
    .errors { color: #dc2626; margin: 0 0 12px; padding-left: 18px; }
    .anomaly-link { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; border-radius: 10px; padding: 9px 13px; font-size: 0.88rem; font-weight: 500; margin-bottom: 14px; overflow-wrap: anywhere; }
    h2 { margin-top: 0; font-size: 1.3rem; }
    .form-foot { display: flex; justify-content: flex-end; margin-top: 4px; }
    button[type="submit"] { min-width: 130px; }
  `;
  constructor() {
    super();
    this.anomaly = "";
    this.buildings = [];
    this.webid = "";
    this.errors = [];
    this.form = { title: "", description: "", priority: "MEDIUM", building_id: "" };
  }
  connectedCallback() {
    super.connectedCallback();
    getJson("/buildings/").then((d3) => resolveMembers(d3)).then((rows) => {
      this.buildings = rows;
    });
    if (this.anomaly) {
      this.form = { ...this.form, title: `Anomaly ${this.anomaly}` };
    }
  }
  async _submit() {
    this.errors = validateTicket(this.form);
    if (this.errors.length > 0) return;
    const payload = buildTicketPayload({ ...this.form, anomaly_ref: this.anomaly || void 0, created_by: this.webid });
    await window.sibStore.post("/tickets/", payload);
    document.dispatchEvent(new CustomEvent("save", { detail: { resource: { "@id": "/tickets/" } } }));
    document.dispatchEvent(new CustomEvent("requestNavigation", { detail: { route: "tickets" } }));
  }
  render() {
    return b2`
      <h2>New ticket</h2>
      ${this.anomaly ? b2`<p class="anomaly-link">linked anomaly: ${this.anomaly}</p>` : ""}
      <form @submit=${(e4) => {
      e4.preventDefault();
      this._submit();
    }}>
        <label>title <input .value=${this.form.title} @input=${(e4) => {
      this.form = { ...this.form, title: e4.target.value };
    }}></label>
        <label>description <textarea .value=${this.form.description} @input=${(e4) => {
      this.form = { ...this.form, description: e4.target.value };
    }}></textarea></label>
        <label>building
          <select @change=${(e4) => {
      this.form = { ...this.form, building_id: e4.target.value };
    }}>
            <option value="" ?selected=${!this.form.building_id}>— select —</option>
            ${this.buildings.map((b3) => b2`<option value=${b3["@id"]} ?selected=${b3["@id"] === this.form.building_id}>${field(b3, "name") ?? b3["@id"]}</option>`)}
          </select>
        </label>
        <label>priority
          <select @change=${(e4) => {
      this.form = { ...this.form, priority: e4.target.value };
    }}>
            ${PRIORITIES.map((p3) => b2`<option value=${p3} ?selected=${p3 === this.form.priority}>${p3}</option>`)}
          </select>
        </label>
        ${this.errors.length > 0 ? b2`<ul class="errors">${this.errors.map((e4) => b2`<li>${e4}</li>`)}</ul>` : ""}
        <div class="form-foot"><button type="submit">Create</button></div>
      </form>`;
  }
};
customElements.define("ticket-new", TicketNew);
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/lit-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/task/task.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
