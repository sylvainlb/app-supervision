// ../app-store/node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
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
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t3) {
    this._$Ei(), (this.l ??= []).push(t3);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t3, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t3) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t3, s5), !s5.noAccessor) {
      const i6 = /* @__PURE__ */ Symbol(), h4 = this.getPropertyDescriptor(t3, i6, s5);
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
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
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
var i5 = /* @__PURE__ */ Symbol();
var h3 = class {
  get taskComplete() {
    return this.t || (1 === this.i ? this.t = new Promise(((t3, s5) => {
      this.o = t3, this.h = s5;
    })) : 3 === this.i ? this.t = Promise.reject(this.l) : this.t = Promise.resolve(this.u)), this.t;
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
    t3 ??= this.T(), this.O = t3, 1 === this.i ? this.q?.abort() : (this.t = void 0, this.o = void 0, this.h = void 0), this.i = 1, "afterUpdate" === this.autoRun ? queueMicrotask((() => this._.requestUpdate())) : this._.requestUpdate();
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
var r4 = (s5, i6) => s5 === i6 || s5.length === i6.length && s5.every(((s6, h4) => !f(s6, i6[h4])));

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
async function resolveMembers(data) {
  const members = data?.["ldp:contains"] ?? (Array.isArray(data) ? data : []);
  return Promise.all(members.map(async (m2) => {
    if (m2 && typeof m2 === "object" && m2["@id"] && Object.keys(m2).filter((k2) => k2 !== "@id" && k2 !== "@type").length === 0) {
      try {
        return await getJson(m2["@id"]);
      } catch {
        return m2;
      }
    }
    return m2;
  }));
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

// ../app-store/components/shared/logic.js
function parseWebidPk(webid, podUrl) {
  if (!webid || typeof webid !== "string") return null;
  let u3;
  try {
    u3 = new URL(webid);
  } catch {
    return null;
  }
  if (podUrl) {
    let pod;
    try {
      pod = new URL(podUrl);
    } catch {
      return null;
    }
    if (u3.origin !== pod.origin) return null;
  }
  const m2 = u3.pathname.match(/^\/users\/(\d+)\/?$/);
  if (!m2) return null;
  return { pk: m2[1], host: u3.host };
}
function prefsPath(webid, podUrl) {
  const p3 = parseWebidPk(webid, podUrl);
  return p3 ? `/prefs/${p3.pk}` : null;
}
function featureEnabled(prefsObj, feature) {
  if (!feature) return false;
  const slug = get(feature, "slug");
  const entry = prefsObj?.[slug];
  if (entry && typeof entry.enabled === "boolean") return entry.enabled;
  return !!get(feature, "default_enabled");
}
function get(obj, name) {
  if (!obj || typeof obj !== "object") return void 0;
  if (obj[name] !== void 0) return obj[name];
  for (const k2 of Object.keys(obj)) if (k2.endsWith(":" + name)) return obj[k2];
  return void 0;
}
function roleAllowed(roleMin, role) {
  if (!roleMin || roleMin === "all") return true;
  if (role === "admin") return true;
  return roleMin === role;
}
function configDefaults(schema) {
  const out = {};
  for (const f3 of schema?.fields ?? []) {
    if (f3.default !== void 0) out[f3.key] = f3.default;
  }
  return out;
}
function prefsColumn(data) {
  if (!data || typeof data !== "object") return {};
  for (const k2 of Object.keys(data)) {
    if (k2 === "prefs" || k2.endsWith(":prefs")) {
      if (data[k2] && typeof data[k2] === "object" && !Array.isArray(data[k2])) return data[k2];
    }
  }
  return {};
}
function prefsPatchBody(patch, current = {}) {
  const merged = { ...current };
  for (const [slug, val] of Object.entries(patch ?? {})) {
    merged[slug] = { ...current?.[slug] ?? {}, ...val ?? {} };
  }
  return { prefs: merged };
}
function featureForPath(catalogue, pathname) {
  if (!pathname) return null;
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  for (const f3 of catalogue ?? []) {
    const route = get(f3, "route");
    if (!route) continue;
    const r5 = route.replace(/\/+$/, "") || "/";
    if (r5 === path) return f3;
  }
  for (const f3 of catalogue ?? []) {
    const route = get(f3, "route");
    if (!route || !route.includes(":")) continue;
    const base = route.split(":")[0].replace(/\/+$/, "");
    if (base && (path === base || path.startsWith(base + "/"))) return f3;
  }
  for (const f3 of catalogue ?? []) {
    const route = get(f3, "route");
    if (!route || route.includes(":")) continue;
    const base = route.replace(/\/+$/, "") || "/";
    if (base !== "/" && path.startsWith(base + "/")) return f3;
  }
  return null;
}

// ../app-store/components/shared/app-store-api.js
var AppStoreConflictError = class extends Error {
  constructor(message = "412 \u2014 prefs changed in the meantime, reloaded") {
    super(message);
    this.name = "AppStoreConflictError";
    this.status = 412;
  }
};
var state = {
  podUrl: "",
  getWebid: () => window.appSession?.info?.webId ?? window.sibAuth?.info?.webId ?? "",
  getRole: () => window.appRole ?? "",
  catalogue: [],
  // resolved members of /features/
  catalogueMissing: false,
  // GET /features/ → 404: model not deployed server-side
  prefs: null,
  // /prefs/<pk> resource (full JSON-LD object)
  prefsObj: {},
  // flattened prefs.prefs jsonb column
  prefsIri: null,
  // relative path "/prefs/<pk>"
  etag: null,
  ready: null,
  // promise of the first refresh
  listeners: /* @__PURE__ */ new Set()
};
function fetchAuthn() {
  return window.sibStore?.fetchAuthn ?? fetch.bind(window);
}
async function getJsonMeta(path) {
  const res = await fetchAuthn()(path, { headers: { accept: "application/ld+json" } });
  if (!res.ok) {
    const err = new Error(`GET ${path} \u2192 ${res.status}`);
    err.status = res.status;
    try {
      err.body = await res.json();
    } catch {
    }
    throw err;
  }
  const data = await res.json();
  return { data, etag: res.headers?.get?.("etag") ?? null };
}
async function resolveMembers2(data) {
  const members = data?.["ldp:contains"] ?? (Array.isArray(data) ? data : []);
  return Promise.all(members.map(async (m2) => {
    const id = m2?.["@id"] ?? m2;
    if (typeof id !== "string") return m2;
    if (m2 && typeof m2 === "object" && Object.keys(m2).filter((k2) => k2 !== "@id" && k2 !== "@type").length === 0) {
      try {
        return (await getJsonMeta(id)).data;
      } catch {
        return m2;
      }
    }
    return m2;
  }));
}
function emit() {
  for (const cb of state.listeners) {
    try {
      cb({ catalogue: state.catalogue, prefs: state.prefsObj });
    } catch {
    }
  }
}
var appStore = {
  /** To call at shell boot: webid/role come from the host app's OIDC session. */
  configure({ getWebid, getRole, podUrl } = {}) {
    if (getWebid) state.getWebid = getWebid;
    if (getRole) state.getRole = getRole;
    if (podUrl) state.podUrl = podUrl;
    state.prefsIri = prefsPath(state.getWebid(), state.podUrl);
    return state.prefsIri;
  },
  /** §1.9.12 — "/prefs/<pk>" extracted from the webid claim; webid outside the pod → null (forbidden in v1). */
  mePrefsIri() {
    if (!state.prefsIri) state.prefsIri = prefsPath(state.getWebid(), state.podUrl);
    return state.prefsIri;
  },
  isAdmin() {
    return state.getRole() === "admin";
  },
  /** Current role (OIDC claim), passed to menuEntries for role_min filtering (§1.4.1). */
  getRole() {
    return state.getRole?.() ?? null;
  },
  /** GET /features/ → 404: app-store model not deployed server-side. */
  isCatalogueMissing() {
    return state.catalogueMissing;
  },
  /** Pod URL configured at boot (configure({podUrl})) — absolute proxy calls (CORS handled by the back end). */
  getPodUrl() {
    return state.podUrl;
  },
  /** Loads (or reloads) catalogue + prefs. Read-after-write: after each PATCH. */
  async refresh() {
    const iri = this.mePrefsIri();
    const jobs = [getJsonMeta("/features/").then(async (r5) => {
      state.catalogue = await resolveMembers2(r5.data);
      state.catalogueMissing = false;
    }).catch((e4) => {
      if (e4.status === 404) {
        state.catalogueMissing = true;
        state.catalogue = [];
        return;
      }
      throw e4;
    })];
    if (iri) {
      jobs.push(getJsonMeta(iri).then((r5) => {
        state.prefs = r5.data;
        state.prefsObj = { ...prefsColumn(r5.data) };
        state.etag = r5.etag;
      }));
    }
    await Promise.all(jobs);
    emit();
  },
  /** Promise of the first load (for components mounted before boot). */
  whenReady() {
    if (!state.ready) state.ready = this.refresh().catch(() => {
    });
    return state.ready;
  },
  onChange(cb) {
    state.listeners.add(cb);
    return () => state.listeners.delete(cb);
  },
  getFeature(slug) {
    return state.catalogue.find((f3) => get(f3, "slug") === slug) ?? null;
  },
  getCatalogue() {
    return state.catalogue;
  },
  /** v2 — (catalogue) feature whose Orbit route matches the requested path (§2.2.7). */
  getFeatureByRoute(pathname) {
    return featureForPath(state.catalogue, pathname);
  },
  getPrefs() {
    return state.prefsObj;
  },
  /** §1.9.7 — synchronous, reads the cache. Key absent = default_enabled (§1.9.4a). */
  isEnabled(slug) {
    const f3 = this.getFeature(slug);
    if (!f3) return false;
    return featureEnabled(state.prefsObj, f3);
  },
  /**
   * §1.5 + §1.9.9 — PATCH merge-patch on /prefs/<pk>, body form R1:
   * {"prefs": {"<slug>": {"enabled": false}}} (recursive RFC 7386 merge).
   * Success → read-after-write (refresh) + `save` event with the prefs' @id.
   * 412 → prefs reloaded + AppStoreConflictError.
   */
  async patchPrefs(patch) {
    const iri = this.mePrefsIri();
    if (!iri) throw new Error("appStore: webid not resolved (configure({getWebid}) at boot)");
    const headers = {
      "content-type": "application/merge-patch+json",
      accept: "application/ld+json"
    };
    if (state.etag) headers["if-match"] = state.etag;
    const res = await fetchAuthn()(iri, {
      method: "PATCH",
      headers,
      body: JSON.stringify(prefsPatchBody(patch, state.prefsObj))
      // read-modify-write : objet complet (§1.5)
    });
    if (res.status === 412) {
      await this.refresh();
      throw new AppStoreConflictError();
    }
    if (!res.ok) {
      const err = new Error(`PATCH ${iri} \u2192 ${res.status}`);
      err.status = res.status;
      try {
        err.body = await res.json();
      } catch {
      }
      throw err;
    }
    const data = await res.json().catch(() => null);
    if (data) state.prefsObj = { ...prefsColumn(data) };
    if (data?.["@id"]) state.prefs = data;
    state.etag = res.headers?.get?.("etag") ?? state.etag;
    emit();
    document.dispatchEvent(new CustomEvent("save", {
      detail: { resource: { "@id": state.prefs?.["@id"] ?? iri } }
    }));
    return data;
  },
  /**
   * §1.9.7 / CA-A4 — shell route guard: intercepts requestNavigation
   * (capture) + navigate, finds the feature by route, and redirects to
   * defaultPath if the feature is disabled or unknown.
   */
  installRouteGuard({ defaultPath = "/" } = {}) {
    const check = (pathname, ev) => {
      if (!pathname || pathname.split("?")[0] === defaultPath) return true;
      const f3 = featureForPath(state.catalogue, pathname);
      const slug = f3 ? f3.slug ?? get(f3, "slug") : null;
      const roleOk = f3 ? roleAllowed(get(f3, "role_min") ?? "all", state.getRole()) : true;
      if (f3 && slug && (!roleOk || !this.isEnabled(slug))) {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        document.dispatchEvent(new CustomEvent("requestNavigation", {
          detail: { route: null, resource: defaultPath }
        }));
        return false;
      }
      return true;
    };
    const onNav = (e4) => {
      const d3 = e4.detail ?? {};
      let path = typeof d3.resource === "string" && d3.resource.startsWith("/") ? d3.resource : null;
      if (!path && d3.route && Array.isArray(window.orbit?.routes)) {
        path = window.orbit.routes.find((r5) => r5.name === d3.route)?.path ?? null;
      }
      if (path) check(path, e4);
    };
    document.addEventListener("requestNavigation", onNav, true);
    document.addEventListener("navigate", () => check(window.location.pathname), true);
    this.whenReady().then(() => check(window.location.pathname));
    return () => document.removeEventListener("requestNavigation", onNav, true);
  },
  /**
   * §1.9.7 — mixin for route components: the `feature-slug` attribute tells
   * which feature owns the route; if it is disabled → redirect `/`.
   */
  AppStoreGuardMixin(Base) {
    return class extends Base {
      static properties = { ...Base.properties ?? {}, featureSlug: { type: String, attribute: "feature-slug" } };
      connectedCallback() {
        super.connectedCallback?.();
        appStore.whenReady().then(() => {
          if (this.featureSlug && !appStore.isEnabled(this.featureSlug)) {
            document.dispatchEvent(new CustomEvent("requestNavigation", { detail: { resource: "/" } }));
          }
        });
      }
    };
  }
};
if (typeof window !== "undefined") {
  window.appStore = window.appStore ?? appStore;
}
var app_store_api_default = appStore;

// components/shared/feature-data.js
var ASSETS = {
  anomaly_candidates: "/gold/anomaly_candidates/",
  city_dashboard_summary: "/gold/city_dashboard_summary/",
  energy_cost_daily: "/gold/energy_cost_daily/",
  net_grid_hourly: "/gold/net_grid_hourly/",
  pv_performance_hourly: "/gold/pv_performance_hourly/",
  weather_hourly: "/gold/weather_hourly/",
  price_hourly: "/gold/price_hourly/",
  // CR-1
  city_event_hourly: "/gold/city_event_hourly/",
  // CR-1
  annual_site_consumption: "/gold/annual_site_consumption/",
  // CR-4
  buildings: "/buildings/",
  tickets: "/tickets/"
};
function getFeatureConfig(slug) {
  const feature = app_store_api_default.getFeature(slug);
  const schema = feature ? get(feature, "config_schema") : null;
  const stored = app_store_api_default.getPrefs()?.[slug]?.config ?? {};
  return { ...configDefaults(schema), ...stored };
}
function tsOf(row) {
  return get(row, "hour") ?? get(row, "ts") ?? get(row, "timestamp") ?? get(row, "event_timestamp") ?? get(row, "day") ?? null;
}
function pick(row, ...names) {
  for (const n4 of names) {
    const v2 = get(row, n4);
    if (v2 !== void 0 && v2 !== null) return v2;
  }
  return void 0;
}
function filterWindow(rows, { from, to } = {}) {
  if (!from && !to) return rows ?? [];
  return (rows ?? []).filter((r5) => {
    const ts = tsOf(r5);
    if (!ts) return true;
    const s5 = String(ts);
    if (from && s5 < String(from).slice(0, s5.length)) return false;
    if (to && s5 > String(to).slice(0, s5.length)) return false;
    return true;
  });
}
async function loadAsset(assetId, { from, to } = {}) {
  const container = ASSETS[assetId];
  if (!container) throw new Error(`asset unknown to the LDP mapping: ${assetId}`);
  let rows;
  try {
    rows = await resolveMembers(await getJson(container));
  } catch (e4) {
    if (e4.status === 404) {
      e4.url = container;
      e4.hint = `LDP container not published: ${container} \u2014 deliver the gold matview + its asset_mapping (CR, catalogue \xA72)`;
    }
    throw e4;
  }
  return filterWindow(rows, { from, to });
}
function isMissingBackend(e4) {
  return e4?.status === 404 && typeof e4?.url === "string" && (e4.url.startsWith("/gold/") || e4.url.includes("/app/llm") || e4.url.includes("/dsp/"));
}
function monthBounds(now = /* @__PURE__ */ new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: start.toISOString(), to: now.toISOString() };
}

// components/shared/feature-base.js
var FeatureComponent = class extends OrbitComponent {
  static styles = OrbitComponent.styles;
  render() {
    const err = this._task?.error;
    if (err && isMissingBackend(err)) {
      return b2`<div class="error" role="alert">
        <b>Data unavailable on the server side.</b><br>
        <code>${err.message}</code><br>
        <span class="fresh">${err.hint ?? "Server work to be delivered \u2014 the feature will activate once the back end is deployed."}</span>
      </div>`;
    }
    return super.render();
  }
};

// components/features/pv-gauge/pv-gauge.js
function selfConsumptionPct(pvRows, gridRows, batteryKwh = 0) {
  let pv = 0, inj = 0;
  for (const r5 of pvRows ?? []) pv += Math.max(0, Number(pick(r5, "pv_generation_kw", "production_kw", "pv_kw") ?? 0));
  for (const r5 of gridRows ?? []) inj += Math.max(0, -Number(pick(r5, "net_grid_kw", "net_kw") ?? 0));
  if (pv <= 0) return null;
  const battery = Math.max(0, Number(batteryKwh ?? 0));
  const self = Math.min(pv, pv - Math.min(inj, inj) + Math.min(inj, battery * 0));
  const base = pv - inj;
  const withBattery = Math.min(pv, base + Math.min(inj, battery));
  return { pct: Math.max(0, base) / pv * 100, pctBattery: Math.max(0, withBattery) / pv * 100, pv, injection: inj };
}
var PvGauge = class extends FeatureComponent {
  static properties = {
    ...FeatureComponent.properties,
    stats: { type: Object, attribute: false },
    batteryKwh: { type: Number, attribute: false }
  };
  static styles = i`
    ${FeatureComponent.styles}
    .gauge { height: 18px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin: 8px 0; }
    .gauge > div { height: 100%; background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .kpis { display: flex; gap: 18px; flex-wrap: wrap; }
    .kpi { font-size: .85rem; color: var(--muted); } .kpi b { display: block; font-size: 1.15rem; color: var(--ink); }
  `;
  constructor() {
    super();
    this.stats = null;
    this.batteryKwh = 0;
  }
  async load() {
    const config = getFeatureConfig("pv-selfconsumption");
    this.batteryKwh = Number(config.battery_kwh ?? 0);
    const { from, to } = monthBounds();
    const [pv, grid] = await Promise.all([
      loadAsset("pv_performance_hourly", { from, to }),
      loadAsset("net_grid_hourly", { from, to })
    ]);
    this.stats = selfConsumptionPct(pv, grid, this.batteryKwh);
    this.objects = [this.stats];
    return this.stats;
  }
  isEmpty() {
    return !this.stats;
  }
  renderContent() {
    const s5 = this.stats;
    const pct = this.batteryKwh > 0 ? s5.pctBattery : s5.pct;
    return b2`
      <h2 style="margin:0 0 6px;font-size:1.05rem">PV self-consumption${this.batteryKwh > 0 ? ` (+ battery ${this.batteryKwh} kWh)` : ""}</h2>
      <div class="kpis">
        <span class="kpi"><b>${pct == null ? "\u2014" : pct.toFixed(0) + " %"}</b>self-consumption</span>
        <span class="kpi"><b>${s5.pv.toFixed(0)} kWh</b>PV production</span>
        <span class="kpi"><b>${s5.injection.toFixed(0)} kWh</b>grid injection</span>
      </div>
      <div class="gauge" role="progressbar" aria-valuenow=${(pct ?? 0).toFixed(0)}>
        <div style="width:${Math.min(100, pct ?? 0)}%"></div>
      </div>
    `;
  }
};
customElements.define("pv-gauge", PvGauge);
export {
  PvGauge,
  selfConsumptionPct
};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/task/task.js:
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
*/
