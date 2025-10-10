import { g as store_get, a as attr, f as attr_class, b as attr_style, s as stringify, j as clsx, k as slot, u as unsubscribe_stores, d as bind_props, l as sanitize_props, m as rest_props, c as ensure_array_like, n as spread_props, o as store_set, p as attributes, q as sanitize_slots } from "./index2.js";
import { V as ssr_context, T as getContext, U as escape_html, S as setContext, W as hasContext } from "./context.js";
import { f as fallback } from "./utils.js";
import { g as get$2, w as writable, r as readable, d as derived } from "./index.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function cc(names) {
  if (typeof names === "string" || typeof names === "number") return "" + names;
  let out = "";
  if (Array.isArray(names)) {
    for (let i = 0, tmp; i < names.length; i++) {
      if ((tmp = cc(names[i])) !== "") {
        out += (out && " ") + tmp;
      }
    }
  } else {
    for (let k in names) {
      if (names[k]) out += (out && " ") + k;
    }
  }
  return out;
}
var noop = { value: () => {
} };
function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}
function Dispatch(_) {
  this._ = _;
}
function parseTypenames$1(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return { type: t, name };
  });
}
Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._, T = parseTypenames$1(typename + "", _), t, i = -1, n = T.length;
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
      return;
    }
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
    }
    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};
function get$1(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}
function set$1(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({ name, value: callback });
  return type;
}
var xhtml = "http://www.w3.org/1999/xhtml";
const namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};
function namespace(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? { space: namespaces[prefix], local: name } : name;
}
function creatorInherit(name) {
  return function() {
    var document2 = this.ownerDocument, uri = this.namespaceURI;
    return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name) : document2.createElementNS(uri, name);
  };
}
function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}
function creator(name) {
  var fullname = namespace(name);
  return (fullname.local ? creatorFixed : creatorInherit)(fullname);
}
function none() {
}
function selector(selector2) {
  return selector2 == null ? none : function() {
    return this.querySelector(selector2);
  };
}
function selection_select(select) {
  if (typeof select !== "function") select = selector(select);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }
  return new Selection$2(subgroups, this._parents);
}
function array(x) {
  return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
}
function empty() {
  return [];
}
function selectorAll(selector2) {
  return selector2 == null ? empty : function() {
    return this.querySelectorAll(selector2);
  };
}
function arrayAll(select) {
  return function() {
    return array(select.apply(this, arguments));
  };
}
function selection_selectAll(select) {
  if (typeof select === "function") select = arrayAll(select);
  else select = selectorAll(select);
  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }
  return new Selection$2(subgroups, parents);
}
function matcher(selector2) {
  return function() {
    return this.matches(selector2);
  };
}
function childMatcher(selector2) {
  return function(node) {
    return node.matches(selector2);
  };
}
var find = Array.prototype.find;
function childFind(match) {
  return function() {
    return find.call(this.children, match);
  };
}
function childFirst() {
  return this.firstElementChild;
}
function selection_selectChild(match) {
  return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
}
var filter = Array.prototype.filter;
function children() {
  return Array.from(this.children);
}
function childrenFilter(match) {
  return function() {
    return filter.call(this.children, match);
  };
}
function selection_selectChildren(match) {
  return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
}
function selection_filter(match) {
  if (typeof match !== "function") match = matcher(match);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }
  return new Selection$2(subgroups, this._parents);
}
function sparse(update) {
  return new Array(update.length);
}
function selection_enter() {
  return new Selection$2(this._enter || this._groups.map(sparse), this._parents);
}
function EnterNode(parent, datum2) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum2;
}
EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) {
    return this._parent.insertBefore(child, this._next);
  },
  insertBefore: function(child, next) {
    return this._parent.insertBefore(child, next);
  },
  querySelector: function(selector2) {
    return this._parent.querySelector(selector2);
  },
  querySelectorAll: function(selector2) {
    return this._parent.querySelectorAll(selector2);
  }
};
function constant$1(x) {
  return function() {
    return x;
  };
}
function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0, node, groupLength = group.length, dataLength = data.length;
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}
function bindKey(parent, group, enter, update, exit, data, key2) {
  var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = key2.call(node, node.__data__, i, group) + "";
      if (nodeByKeyValue.has(keyValue)) {
        exit[i] = node;
      } else {
        nodeByKeyValue.set(keyValue, node);
      }
    }
  }
  for (i = 0; i < dataLength; ++i) {
    keyValue = key2.call(parent, data[i], i, data) + "";
    if (node = nodeByKeyValue.get(keyValue)) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue.delete(keyValue);
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) {
      exit[i] = node;
    }
  }
}
function datum(node) {
  return node.__data__;
}
function selection_data(value, key2) {
  if (!arguments.length) return Array.from(this, datum);
  var bind = key2 ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
  if (typeof value !== "function") value = constant$1(value);
  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength), exitGroup = exit[j] = new Array(groupLength);
    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key2);
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength) ;
        previous._next = next || null;
      }
    }
  }
  update = new Selection$2(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
}
function arraylike(data) {
  return typeof data === "object" && "length" in data ? data : Array.from(data);
}
function selection_exit() {
  return new Selection$2(this._exit || this._groups.map(sparse), this._parents);
}
function selection_join(onenter, onupdate, onexit) {
  var enter = this.enter(), update = this, exit = this.exit();
  if (typeof onenter === "function") {
    enter = onenter(enter);
    if (enter) enter = enter.selection();
  } else {
    enter = enter.append(onenter + "");
  }
  if (onupdate != null) {
    update = onupdate(update);
    if (update) update = update.selection();
  }
  if (onexit == null) exit.remove();
  else onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
}
function selection_merge(context) {
  var selection2 = context.selection ? context.selection() : context;
  for (var groups0 = this._groups, groups1 = selection2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }
  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }
  return new Selection$2(merges, this._parents);
}
function selection_order() {
  for (var groups = this._groups, j = -1, m = groups.length; ++j < m; ) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }
  return this;
}
function selection_sort(compare) {
  if (!compare) compare = ascending;
  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }
  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }
  return new Selection$2(sortgroups, this._parents).order();
}
function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}
function selection_call() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
}
function selection_nodes() {
  return Array.from(this);
}
function selection_node() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }
  return null;
}
function selection_size() {
  let size = 0;
  for (const node of this) ++size;
  return size;
}
function selection_empty() {
  return !this.node();
}
function selection_each(callback) {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }
  return this;
}
function attrRemove$1(name) {
  return function() {
    this.removeAttribute(name);
  };
}
function attrRemoveNS$1(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}
function attrConstant$1(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}
function attrConstantNS$1(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}
function attrFunction$1(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}
function attrFunctionNS$1(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}
function selection_attr(name, value) {
  var fullname = namespace(name);
  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
  }
  return this.each((value == null ? fullname.local ? attrRemoveNS$1 : attrRemove$1 : typeof value === "function" ? fullname.local ? attrFunctionNS$1 : attrFunction$1 : fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, value));
}
function defaultView(node) {
  return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
}
function styleRemove$1(name) {
  return function() {
    this.style.removeProperty(name);
  };
}
function styleConstant$1(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}
function styleFunction$1(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}
function selection_style(name, value, priority) {
  return arguments.length > 1 ? this.each((value == null ? styleRemove$1 : typeof value === "function" ? styleFunction$1 : styleConstant$1)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
}
function styleValue(node, name) {
  return node.style.getPropertyValue(name) || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}
function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}
function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}
function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}
function selection_property(name, value) {
  return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
}
function classArray(string) {
  return string.trim().split(/^|\s+/);
}
function classList(node) {
  return node.classList || new ClassList(node);
}
function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}
ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};
function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}
function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}
function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}
function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}
function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}
function selection_classed(name, value) {
  var names = classArray(name + "");
  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }
  return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
}
function textRemove() {
  this.textContent = "";
}
function textConstant$1(value) {
  return function() {
    this.textContent = value;
  };
}
function textFunction$1(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}
function selection_text(value) {
  return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction$1 : textConstant$1)(value)) : this.node().textContent;
}
function htmlRemove() {
  this.innerHTML = "";
}
function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}
function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}
function selection_html(value) {
  return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
}
function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}
function selection_raise() {
  return this.each(raise);
}
function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function selection_lower() {
  return this.each(lower);
}
function selection_append(name) {
  var create2 = typeof name === "function" ? name : creator(name);
  return this.select(function() {
    return this.appendChild(create2.apply(this, arguments));
  });
}
function constantNull() {
  return null;
}
function selection_insert(name, before) {
  var create2 = typeof name === "function" ? name : creator(name), select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function() {
    return this.insertBefore(create2.apply(this, arguments), select.apply(this, arguments) || null);
  });
}
function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}
function selection_remove() {
  return this.each(remove);
}
function selection_cloneShallow() {
  var clone = this.cloneNode(false), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}
function selection_cloneDeep() {
  var clone = this.cloneNode(true), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}
function selection_clone(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
}
function selection_datum(value) {
  return arguments.length ? this.property("__data__", value) : this.node().__data__;
}
function contextListener(listener) {
  return function(event) {
    listener.call(this, event, this.__data__);
  };
}
function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return { type: t, name };
  });
}
function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}
function onAdd(typename, value, options) {
  return function() {
    var on = this.__on, o, listener = contextListener(value);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
        this.addEventListener(o.type, o.listener = listener, o.options = options);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, options);
    o = { type: typename.type, name: typename.name, value, listener, options };
    if (!on) this.__on = [o];
    else on.push(o);
  };
}
function selection_on(typename, value, options) {
  var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;
  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }
  on = value ? onAdd : onRemove;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
  return this;
}
function dispatchEvent(node, type, params) {
  var window2 = defaultView(node), event = window2.CustomEvent;
  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window2.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }
  node.dispatchEvent(event);
}
function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}
function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}
function selection_dispatch(type, params) {
  return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
}
function* selection_iterator() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) yield node;
    }
  }
}
var root = [null];
function Selection$2(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}
function selection() {
  return new Selection$2([[document.documentElement]], root);
}
function selection_selection() {
  return this;
}
Selection$2.prototype = selection.prototype = {
  constructor: Selection$2,
  select: selection_select,
  selectAll: selection_selectAll,
  selectChild: selection_selectChild,
  selectChildren: selection_selectChildren,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  join: selection_join,
  merge: selection_merge,
  selection: selection_selection,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch,
  [Symbol.iterator]: selection_iterator
};
function define(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}
function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key2 in definition) prototype[key2] = definition[key2];
  return prototype;
}
function Color() {
}
var darker = 0.7;
var brighter = 1 / darker;
var reI = "\\s*([+-]?\\d+)\\s*", reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", reHex = /^#([0-9a-f]{3,8})$/, reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`), reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`), reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`), reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`), reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`), reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
var named = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
define(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor(), this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});
function color_formatHex() {
  return this.rgb().formatHex();
}
function color_formatHex8() {
  return this.rgb().formatHex8();
}
function color_formatHsl() {
  return hslConvert(this).formatHsl();
}
function color_formatRgb() {
  return this.rgb().formatRgb();
}
function color(format) {
  var m, l;
  format = (format + "").trim().toLowerCase();
  return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
}
function rgbn(n) {
  return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
}
function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}
function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb();
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}
function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}
function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}
define(Rgb, rgb, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));
function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}
function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function rgb_formatRgb() {
  const a = clampa(this.opacity);
  return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
}
function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}
function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}
function hex(value) {
  value = clampi(value);
  return (value < 16 ? "0" : "") + value.toString(16);
}
function hsla(h, s, l, a) {
  if (a <= 0) h = s = l = NaN;
  else if (l <= 0 || l >= 1) h = s = NaN;
  else if (s <= 0) h = NaN;
  return new Hsl(h, s, l, a);
}
function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl();
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255, g = o.g / 255, b = o.b / 255, min = Math.min(r, g, b), max = Math.max(r, g, b), h = NaN, s = max - min, l = (max + min) / 2;
  if (s) {
    if (r === max) h = (g - b) / s + (g < b) * 6;
    else if (g === max) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}
function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}
function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}
define(Hsl, hsl, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s, m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
  }
}));
function clamph(value) {
  value = (value || 0) % 360;
  return value < 0 ? value + 360 : value;
}
function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
}
const constant = (x) => () => x;
function linear(a, d) {
  return function(t) {
    return a + t * d;
  };
}
function exponential(a, b, y) {
  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
    return Math.pow(a + t * b, y);
  };
}
function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
  };
}
function nogamma(a, b) {
  var d = b - a;
  return d ? linear(a, d) : constant(isNaN(a) ? b : a);
}
const interpolateRgb = function rgbGamma(y) {
  var color2 = gamma(y);
  function rgb$1(start2, end) {
    var r = color2((start2 = rgb(start2)).r, (end = rgb(end)).r), g = color2(start2.g, end.g), b = color2(start2.b, end.b), opacity = nogamma(start2.opacity, end.opacity);
    return function(t) {
      start2.r = r(t);
      start2.g = g(t);
      start2.b = b(t);
      start2.opacity = opacity(t);
      return start2 + "";
    };
  }
  rgb$1.gamma = rgbGamma;
  return rgb$1;
}(1);
function interpolateNumber(a, b) {
  return a = +a, b = +b, function(t) {
    return a * (1 - t) + b * t;
  };
}
var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, reB = new RegExp(reA.source, "g");
function zero(b) {
  return function() {
    return b;
  };
}
function one(b) {
  return function(t) {
    return b(t) + "";
  };
}
function interpolateString(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
  a = a + "", b = b + "";
  while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) {
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs;
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) {
      if (s[i]) s[i] += bm;
      else s[++i] = bm;
    } else {
      s[++i] = null;
      q.push({ i, x: interpolateNumber(am, bm) });
    }
    bi = reB.lastIndex;
  }
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs;
    else s[++i] = bs;
  }
  return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function(t) {
    for (var i2 = 0, o; i2 < b; ++i2) s[(o = q[i2]).i] = o.x(t);
    return s.join("");
  });
}
var degrees = 180 / Math.PI;
var identity = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};
function decompose(a, b, c, d, e, f) {
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * degrees,
    skewX: Math.atan(skewX) * degrees,
    scaleX,
    scaleY
  };
}
var svgNode;
function parseCss(value) {
  const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
  return m.isIdentity ? identity : decompose(m.a, m.b, m.c, m.d, m.e, m.f);
}
function parseSvg(value) {
  if (value == null) return identity;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
  value = value.matrix;
  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
}
function interpolateTransform(parse, pxComma, pxParen, degParen) {
  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }
  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({ i: i - 4, x: interpolateNumber(xa, xb) }, { i: i - 2, x: interpolateNumber(ya, yb) });
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }
  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360;
      else if (b - a > 180) a += 360;
      q.push({ i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b) });
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }
  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({ i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b) });
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }
  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({ i: i - 4, x: interpolateNumber(xa, xb) }, { i: i - 2, x: interpolateNumber(ya, yb) });
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }
  return function(a, b) {
    var s = [], q = [];
    a = parse(a), b = parse(b);
    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
    rotate(a.rotate, b.rotate, s, q);
    skewX(a.skewX, b.skewX, s, q);
    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
    a = b = null;
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}
var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");
var frame = 0, timeout$1 = 0, interval = 0, pokeDelay = 1e3, taskHead, taskTail, clockLast = 0, clockNow = 0, clockSkew = 0, clock = typeof performance === "object" && performance.now ? performance : Date, setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
  setTimeout(f, 17);
};
function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}
function clearNow() {
  clockNow = 0;
}
function Timer() {
  this._call = this._time = this._next = null;
}
Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};
function timer(callback, delay, time) {
  var t = new Timer();
  t.restart(callback, delay, time);
  return t;
}
function timerFlush() {
  now();
  ++frame;
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(void 0, e);
    t = t._next;
  }
  --frame;
}
function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout$1 = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}
function poke() {
  var now2 = clock.now(), delay = now2 - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now2;
}
function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}
function sleep(time) {
  if (frame) return;
  if (timeout$1) timeout$1 = clearTimeout(timeout$1);
  var delay = time - clockNow;
  if (delay > 24) {
    if (time < Infinity) timeout$1 = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}
function timeout(callback, delay, time) {
  var t = new Timer();
  delay = delay == null ? 0 : +delay;
  t.restart((elapsed) => {
    t.stop();
    callback(elapsed + delay);
  }, delay, time);
  return t;
}
var emptyOn = dispatch("start", "end", "cancel", "interrupt");
var emptyTween = [];
var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;
function schedule(node, name, id2, index, group, timing) {
  var schedules = node.__transition;
  if (!schedules) node.__transition = {};
  else if (id2 in schedules) return;
  create(node, id2, {
    name,
    index,
    // For context during callback.
    group,
    // For context during callback.
    on: emptyOn,
    tween: emptyTween,
    time: timing.time,
    delay: timing.delay,
    duration: timing.duration,
    ease: timing.ease,
    timer: null,
    state: CREATED
  });
}
function init(node, id2) {
  var schedule2 = get(node, id2);
  if (schedule2.state > CREATED) throw new Error("too late; already scheduled");
  return schedule2;
}
function set(node, id2) {
  var schedule2 = get(node, id2);
  if (schedule2.state > STARTED) throw new Error("too late; already running");
  return schedule2;
}
function get(node, id2) {
  var schedule2 = node.__transition;
  if (!schedule2 || !(schedule2 = schedule2[id2])) throw new Error("transition not found");
  return schedule2;
}
function create(node, id2, self) {
  var schedules = node.__transition, tween;
  schedules[id2] = self;
  self.timer = timer(schedule2, 0, self.time);
  function schedule2(elapsed) {
    self.state = SCHEDULED;
    self.timer.restart(start2, self.delay, self.time);
    if (self.delay <= elapsed) start2(elapsed - self.delay);
  }
  function start2(elapsed) {
    var i, j, n, o;
    if (self.state !== SCHEDULED) return stop();
    for (i in schedules) {
      o = schedules[i];
      if (o.name !== self.name) continue;
      if (o.state === STARTED) return timeout(start2);
      if (o.state === RUNNING) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("interrupt", node, node.__data__, o.index, o.group);
        delete schedules[i];
      } else if (+i < id2) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("cancel", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }
    }
    timeout(function() {
      if (self.state === STARTED) {
        self.state = RUNNING;
        self.timer.restart(tick, self.delay, self.time);
        tick(elapsed);
      }
    });
    self.state = STARTING;
    self.on.call("start", node, node.__data__, self.index, self.group);
    if (self.state !== STARTING) return;
    self.state = STARTED;
    tween = new Array(n = self.tween.length);
    for (i = 0, j = -1; i < n; ++i) {
      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
        tween[++j] = o;
      }
    }
    tween.length = j + 1;
  }
  function tick(elapsed) {
    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1), i = -1, n = tween.length;
    while (++i < n) {
      tween[i].call(node, t);
    }
    if (self.state === ENDING) {
      self.on.call("end", node, node.__data__, self.index, self.group);
      stop();
    }
  }
  function stop() {
    self.state = ENDED;
    self.timer.stop();
    delete schedules[id2];
    for (var i in schedules) return;
    delete node.__transition;
  }
}
function interrupt(node, name) {
  var schedules = node.__transition, schedule2, active, empty2 = true, i;
  if (!schedules) return;
  name = name == null ? null : name + "";
  for (i in schedules) {
    if ((schedule2 = schedules[i]).name !== name) {
      empty2 = false;
      continue;
    }
    active = schedule2.state > STARTING && schedule2.state < ENDING;
    schedule2.state = ENDED;
    schedule2.timer.stop();
    schedule2.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule2.index, schedule2.group);
    delete schedules[i];
  }
  if (empty2) delete node.__transition;
}
function selection_interrupt(name) {
  return this.each(function() {
    interrupt(this, name);
  });
}
function tweenRemove(id2, name) {
  var tween0, tween1;
  return function() {
    var schedule2 = set(this, id2), tween = schedule2.tween;
    if (tween !== tween0) {
      tween1 = tween0 = tween;
      for (var i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1 = tween1.slice();
          tween1.splice(i, 1);
          break;
        }
      }
    }
    schedule2.tween = tween1;
  };
}
function tweenFunction(id2, name, value) {
  var tween0, tween1;
  if (typeof value !== "function") throw new Error();
  return function() {
    var schedule2 = set(this, id2), tween = schedule2.tween;
    if (tween !== tween0) {
      tween1 = (tween0 = tween).slice();
      for (var t = { name, value }, i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1[i] = t;
          break;
        }
      }
      if (i === n) tween1.push(t);
    }
    schedule2.tween = tween1;
  };
}
function transition_tween(name, value) {
  var id2 = this._id;
  name += "";
  if (arguments.length < 2) {
    var tween = get(this.node(), id2).tween;
    for (var i = 0, n = tween.length, t; i < n; ++i) {
      if ((t = tween[i]).name === name) {
        return t.value;
      }
    }
    return null;
  }
  return this.each((value == null ? tweenRemove : tweenFunction)(id2, name, value));
}
function tweenValue(transition, name, value) {
  var id2 = transition._id;
  transition.each(function() {
    var schedule2 = set(this, id2);
    (schedule2.value || (schedule2.value = {}))[name] = value.apply(this, arguments);
  });
  return function(node) {
    return get(node, id2).value[name];
  };
}
function interpolate(a, b) {
  var c;
  return (typeof b === "number" ? interpolateNumber : b instanceof color ? interpolateRgb : (c = color(b)) ? (b = c, interpolateRgb) : interpolateString)(a, b);
}
function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}
function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}
function attrConstant(name, interpolate2, value1) {
  var string00, string1 = value1 + "", interpolate0;
  return function() {
    var string0 = this.getAttribute(name);
    return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate2(string00 = string0, value1);
  };
}
function attrConstantNS(fullname, interpolate2, value1) {
  var string00, string1 = value1 + "", interpolate0;
  return function() {
    var string0 = this.getAttributeNS(fullname.space, fullname.local);
    return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate2(string00 = string0, value1);
  };
}
function attrFunction(name, interpolate2, value) {
  var string00, string10, interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttribute(name);
    string0 = this.getAttribute(name);
    string1 = value1 + "";
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate2(string00 = string0, value1));
  };
}
function attrFunctionNS(fullname, interpolate2, value) {
  var string00, string10, interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    string0 = this.getAttributeNS(fullname.space, fullname.local);
    string1 = value1 + "";
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate2(string00 = string0, value1));
  };
}
function transition_attr(name, value) {
  var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
  return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname) : (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
}
function attrInterpolate(name, i) {
  return function(t) {
    this.setAttribute(name, i.call(this, t));
  };
}
function attrInterpolateNS(fullname, i) {
  return function(t) {
    this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
  };
}
function attrTweenNS(fullname, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
    return t0;
  }
  tween._value = value;
  return tween;
}
function attrTween(name, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
    return t0;
  }
  tween._value = value;
  return tween;
}
function transition_attrTween(name, value) {
  var key2 = "attr." + name;
  if (arguments.length < 2) return (key2 = this.tween(key2)) && key2._value;
  if (value == null) return this.tween(key2, null);
  if (typeof value !== "function") throw new Error();
  var fullname = namespace(name);
  return this.tween(key2, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
}
function delayFunction(id2, value) {
  return function() {
    init(this, id2).delay = +value.apply(this, arguments);
  };
}
function delayConstant(id2, value) {
  return value = +value, function() {
    init(this, id2).delay = value;
  };
}
function transition_delay(value) {
  var id2 = this._id;
  return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id2, value)) : get(this.node(), id2).delay;
}
function durationFunction(id2, value) {
  return function() {
    set(this, id2).duration = +value.apply(this, arguments);
  };
}
function durationConstant(id2, value) {
  return value = +value, function() {
    set(this, id2).duration = value;
  };
}
function transition_duration(value) {
  var id2 = this._id;
  return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id2, value)) : get(this.node(), id2).duration;
}
function easeConstant(id2, value) {
  if (typeof value !== "function") throw new Error();
  return function() {
    set(this, id2).ease = value;
  };
}
function transition_ease(value) {
  var id2 = this._id;
  return arguments.length ? this.each(easeConstant(id2, value)) : get(this.node(), id2).ease;
}
function easeVarying(id2, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (typeof v !== "function") throw new Error();
    set(this, id2).ease = v;
  };
}
function transition_easeVarying(value) {
  if (typeof value !== "function") throw new Error();
  return this.each(easeVarying(this._id, value));
}
function transition_filter(match) {
  if (typeof match !== "function") match = matcher(match);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }
  return new Transition(subgroups, this._parents, this._name, this._id);
}
function transition_merge(transition) {
  if (transition._id !== this._id) throw new Error();
  for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }
  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }
  return new Transition(merges, this._parents, this._name, this._id);
}
function start(name) {
  return (name + "").trim().split(/^|\s+/).every(function(t) {
    var i = t.indexOf(".");
    if (i >= 0) t = t.slice(0, i);
    return !t || t === "start";
  });
}
function onFunction(id2, name, listener) {
  var on0, on1, sit = start(name) ? init : set;
  return function() {
    var schedule2 = sit(this, id2), on = schedule2.on;
    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
    schedule2.on = on1;
  };
}
function transition_on(name, listener) {
  var id2 = this._id;
  return arguments.length < 2 ? get(this.node(), id2).on.on(name) : this.each(onFunction(id2, name, listener));
}
function removeFunction(id2) {
  return function() {
    var parent = this.parentNode;
    for (var i in this.__transition) if (+i !== id2) return;
    if (parent) parent.removeChild(this);
  };
}
function transition_remove() {
  return this.on("end.remove", removeFunction(this._id));
}
function transition_select(select) {
  var name = this._name, id2 = this._id;
  if (typeof select !== "function") select = selector(select);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
        schedule(subgroup[i], name, id2, i, subgroup, get(node, id2));
      }
    }
  }
  return new Transition(subgroups, this._parents, name, id2);
}
function transition_selectAll(select) {
  var name = this._name, id2 = this._id;
  if (typeof select !== "function") select = selectorAll(select);
  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        for (var children2 = select.call(node, node.__data__, i, group), child, inherit2 = get(node, id2), k = 0, l = children2.length; k < l; ++k) {
          if (child = children2[k]) {
            schedule(child, name, id2, k, children2, inherit2);
          }
        }
        subgroups.push(children2);
        parents.push(node);
      }
    }
  }
  return new Transition(subgroups, parents, name, id2);
}
var Selection$1 = selection.prototype.constructor;
function transition_selection() {
  return new Selection$1(this._groups, this._parents);
}
function styleNull(name, interpolate2) {
  var string00, string10, interpolate0;
  return function() {
    var string0 = styleValue(this, name), string1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate2(string00 = string0, string10 = string1);
  };
}
function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}
function styleConstant(name, interpolate2, value1) {
  var string00, string1 = value1 + "", interpolate0;
  return function() {
    var string0 = styleValue(this, name);
    return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate2(string00 = string0, value1);
  };
}
function styleFunction(name, interpolate2, value) {
  var string00, string10, interpolate0;
  return function() {
    var string0 = styleValue(this, name), value1 = value(this), string1 = value1 + "";
    if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate2(string00 = string0, value1));
  };
}
function styleMaybeRemove(id2, name) {
  var on0, on1, listener0, key2 = "style." + name, event = "end." + key2, remove2;
  return function() {
    var schedule2 = set(this, id2), on = schedule2.on, listener = schedule2.value[key2] == null ? remove2 || (remove2 = styleRemove(name)) : void 0;
    if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
    schedule2.on = on1;
  };
}
function transition_style(name, value, priority) {
  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
  return value == null ? this.styleTween(name, styleNull(name, i)).on("end.style." + name, styleRemove(name)) : typeof value === "function" ? this.styleTween(name, styleFunction(name, i, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant(name, i, value), priority).on("end.style." + name, null);
}
function styleInterpolate(name, i, priority) {
  return function(t) {
    this.style.setProperty(name, i.call(this, t), priority);
  };
}
function styleTween(name, value, priority) {
  var t, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
    return t;
  }
  tween._value = value;
  return tween;
}
function transition_styleTween(name, value, priority) {
  var key2 = "style." + (name += "");
  if (arguments.length < 2) return (key2 = this.tween(key2)) && key2._value;
  if (value == null) return this.tween(key2, null);
  if (typeof value !== "function") throw new Error();
  return this.tween(key2, styleTween(name, value, priority == null ? "" : priority));
}
function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}
function textFunction(value) {
  return function() {
    var value1 = value(this);
    this.textContent = value1 == null ? "" : value1;
  };
}
function transition_text(value) {
  return this.tween("text", typeof value === "function" ? textFunction(tweenValue(this, "text", value)) : textConstant(value == null ? "" : value + ""));
}
function textInterpolate(i) {
  return function(t) {
    this.textContent = i.call(this, t);
  };
}
function textTween(value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
    return t0;
  }
  tween._value = value;
  return tween;
}
function transition_textTween(value) {
  var key2 = "text";
  if (arguments.length < 1) return (key2 = this.tween(key2)) && key2._value;
  if (value == null) return this.tween(key2, null);
  if (typeof value !== "function") throw new Error();
  return this.tween(key2, textTween(value));
}
function transition_transition() {
  var name = this._name, id0 = this._id, id1 = newId();
  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        var inherit2 = get(node, id0);
        schedule(node, name, id1, i, group, {
          time: inherit2.time + inherit2.delay + inherit2.duration,
          delay: 0,
          duration: inherit2.duration,
          ease: inherit2.ease
        });
      }
    }
  }
  return new Transition(groups, this._parents, name, id1);
}
function transition_end() {
  var on0, on1, that = this, id2 = that._id, size = that.size();
  return new Promise(function(resolve, reject) {
    var cancel = { value: reject }, end = { value: function() {
      if (--size === 0) resolve();
    } };
    that.each(function() {
      var schedule2 = set(this, id2), on = schedule2.on;
      if (on !== on0) {
        on1 = (on0 = on).copy();
        on1._.cancel.push(cancel);
        on1._.interrupt.push(cancel);
        on1._.end.push(end);
      }
      schedule2.on = on1;
    });
    if (size === 0) resolve();
  });
}
var id = 0;
function Transition(groups, parents, name, id2) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id2;
}
function newId() {
  return ++id;
}
var selection_prototype = selection.prototype;
Transition.prototype = {
  constructor: Transition,
  select: transition_select,
  selectAll: transition_selectAll,
  selectChild: selection_prototype.selectChild,
  selectChildren: selection_prototype.selectChildren,
  filter: transition_filter,
  merge: transition_merge,
  selection: transition_selection,
  transition: transition_transition,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: transition_on,
  attr: transition_attr,
  attrTween: transition_attrTween,
  style: transition_style,
  styleTween: transition_styleTween,
  text: transition_text,
  textTween: transition_textTween,
  remove: transition_remove,
  tween: transition_tween,
  delay: transition_delay,
  duration: transition_duration,
  ease: transition_ease,
  easeVarying: transition_easeVarying,
  end: transition_end,
  [Symbol.iterator]: selection_prototype[Symbol.iterator]
};
function cubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}
var defaultTiming = {
  time: null,
  // Set on use.
  delay: 0,
  duration: 250,
  ease: cubicInOut
};
function inherit(node, id2) {
  var timing;
  while (!(timing = node.__transition) || !(timing = timing[id2])) {
    if (!(node = node.parentNode)) {
      throw new Error(`transition ${id2} not found`);
    }
  }
  return timing;
}
function selection_transition(name) {
  var id2, timing;
  if (name instanceof Transition) {
    id2 = name._id, name = name._name;
  } else {
    id2 = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
  }
  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        schedule(node, name, id2, i, group, timing || inherit(node, id2));
      }
    }
  }
  return new Transition(groups, this._parents, name, id2);
}
selection.prototype.interrupt = selection_interrupt;
selection.prototype.transition = selection_transition;
function Transform(k, x, y) {
  this.k = k;
  this.x = x;
  this.y = y;
}
Transform.prototype = {
  constructor: Transform,
  scale: function(k) {
    return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
  },
  translate: function(x, y) {
    return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
  },
  apply: function(point) {
    return [point[0] * this.k + this.x, point[1] * this.k + this.y];
  },
  applyX: function(x) {
    return x * this.k + this.x;
  },
  applyY: function(y) {
    return y * this.k + this.y;
  },
  invert: function(location) {
    return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
  },
  invertX: function(x) {
    return (x - this.x) / this.k;
  },
  invertY: function(y) {
    return (y - this.y) / this.k;
  },
  rescaleX: function(x) {
    return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
  },
  rescaleY: function(y) {
    return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
  },
  toString: function() {
    return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
  }
};
Transform.prototype;
const errorMessages = {
  error001: () => "[React Flow]: Seems like you have not used zustand provider as an ancestor. Help: https://reactflow.dev/error#001",
  error002: () => "It looks like you've created a new nodeTypes or edgeTypes object. If this wasn't on purpose please define the nodeTypes/edgeTypes outside of the component or memoize them.",
  error003: (nodeType) => `Node type "${nodeType}" not found. Using fallback type "default".`,
  error004: () => "The React Flow parent container needs a width and a height to render the graph.",
  error005: () => "Only child nodes can use a parent extent.",
  error006: () => "Can't create edge. An edge needs a source and a target.",
  error007: (id2) => `The old edge with id=${id2} does not exist.`,
  error009: (type) => `Marker type "${type}" doesn't exist.`,
  error008: (handleType, { id: id2, sourceHandle, targetHandle }) => `Couldn't create edge for ${handleType} handle id: "${handleType === "source" ? sourceHandle : targetHandle}", edge id: ${id2}.`,
  error010: () => "Handle: No node id found. Make sure to only use a Handle inside a custom Node.",
  error011: (edgeType) => `Edge type "${edgeType}" not found. Using fallback type "default".`,
  error012: (id2) => `Node with id "${id2}" does not exist, it may have been removed. This can happen when a node is deleted before the "onNodeClick" handler is called.`,
  error013: (lib = "react") => `It seems that you haven't loaded the styles. Please import '@xyflow/${lib}/dist/style.css' or base.css to make sure everything is working properly.`,
  error014: () => "useNodeConnections: No node ID found. Call useNodeConnections inside a custom Node or provide a node ID.",
  error015: () => "It seems that you are trying to drag a node that is not initialized. Please use onNodesChange as explained in the docs."
};
const infiniteExtent = [
  [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
];
var ConnectionMode;
(function(ConnectionMode2) {
  ConnectionMode2["Strict"] = "strict";
  ConnectionMode2["Loose"] = "loose";
})(ConnectionMode || (ConnectionMode = {}));
var PanOnScrollMode;
(function(PanOnScrollMode2) {
  PanOnScrollMode2["Free"] = "free";
  PanOnScrollMode2["Vertical"] = "vertical";
  PanOnScrollMode2["Horizontal"] = "horizontal";
})(PanOnScrollMode || (PanOnScrollMode = {}));
var SelectionMode;
(function(SelectionMode2) {
  SelectionMode2["Partial"] = "partial";
  SelectionMode2["Full"] = "full";
})(SelectionMode || (SelectionMode = {}));
const initialConnection = {
  inProgress: false,
  isValid: null,
  from: null,
  fromHandle: null,
  fromPosition: null,
  fromNode: null,
  to: null,
  toHandle: null,
  toPosition: null,
  toNode: null
};
var ConnectionLineType;
(function(ConnectionLineType2) {
  ConnectionLineType2["Bezier"] = "default";
  ConnectionLineType2["Straight"] = "straight";
  ConnectionLineType2["Step"] = "step";
  ConnectionLineType2["SmoothStep"] = "smoothstep";
  ConnectionLineType2["SimpleBezier"] = "simplebezier";
})(ConnectionLineType || (ConnectionLineType = {}));
var MarkerType;
(function(MarkerType2) {
  MarkerType2["Arrow"] = "arrow";
  MarkerType2["ArrowClosed"] = "arrowclosed";
})(MarkerType || (MarkerType = {}));
var Position;
(function(Position2) {
  Position2["Left"] = "left";
  Position2["Top"] = "top";
  Position2["Right"] = "right";
  Position2["Bottom"] = "bottom";
})(Position || (Position = {}));
({
  [Position.Left]: Position.Right,
  [Position.Right]: Position.Left,
  [Position.Top]: Position.Bottom,
  [Position.Bottom]: Position.Top
});
function areConnectionMapsEqual(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b || a.size !== b.size) {
    return false;
  }
  if (!a.size && !b.size) {
    return true;
  }
  for (const key2 of a.keys()) {
    if (!b.has(key2)) {
      return false;
    }
  }
  return true;
}
function handleConnectionChange(a, b, cb) {
  if (!cb) {
    return;
  }
  const diff = [];
  a.forEach((connection, key2) => {
    if (!b?.has(key2)) {
      diff.push(connection);
    }
  });
  if (diff.length) {
    cb(diff);
  }
}
function getConnectionStatus(isValid) {
  return isValid === null ? null : isValid ? "valid" : "invalid";
}
const isEdgeBase = (element) => "id" in element && "source" in element && "target" in element;
const isInternalNodeBase = (element) => "id" in element && "internals" in element && !("source" in element) && !("target" in element);
const getNodePositionWithOrigin = (node, nodeOrigin = [0, 0]) => {
  const { width, height } = getNodeDimensions(node);
  const origin = node.origin ?? nodeOrigin;
  const offsetX = width * origin[0];
  const offsetY = height * origin[1];
  return {
    x: node.position.x - offsetX,
    y: node.position.y - offsetY
  };
};
const getInternalNodesBounds = (nodeLookup, params = {}) => {
  if (nodeLookup.size === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let box = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity };
  nodeLookup.forEach((node) => {
    if (params.filter === void 0 || params.filter(node)) {
      const nodeBox = nodeToBox(node);
      box = getBoundsOfBoxes(box, nodeBox);
    }
  });
  return boxToRect(box);
};
const getNodesInside = (nodes, rect, [tx, ty, tScale] = [0, 0, 1], partially = false, excludeNonSelectableNodes = false) => {
  const paneRect = {
    ...pointToRendererPoint(rect, [tx, ty, tScale]),
    width: rect.width / tScale,
    height: rect.height / tScale
  };
  const visibleNodes = [];
  for (const node of nodes.values()) {
    const { measured, selectable = true, hidden = false } = node;
    if (excludeNonSelectableNodes && !selectable || hidden) {
      continue;
    }
    const width = measured.width ?? node.width ?? node.initialWidth ?? null;
    const height = measured.height ?? node.height ?? node.initialHeight ?? null;
    const overlappingArea = getOverlappingArea(paneRect, nodeToRect(node));
    const area = (width ?? 0) * (height ?? 0);
    const partiallyVisible = partially && overlappingArea > 0;
    const forceInitialRender = !node.internals.handleBounds;
    const isVisible = forceInitialRender || partiallyVisible || overlappingArea >= area;
    if (isVisible || node.dragging) {
      visibleNodes.push(node);
    }
  }
  return visibleNodes;
};
const getConnectedEdges = (nodes, edges) => {
  const nodeIds = /* @__PURE__ */ new Set();
  nodes.forEach((node) => {
    nodeIds.add(node.id);
  });
  return edges.filter((edge) => nodeIds.has(edge.source) || nodeIds.has(edge.target));
};
function getFitViewNodes(nodeLookup, options) {
  const fitViewNodes = /* @__PURE__ */ new Map();
  const optionNodeIds = options?.nodes ? new Set(options.nodes.map((node) => node.id)) : null;
  nodeLookup.forEach((n) => {
    const isVisible = n.measured.width && n.measured.height && (options?.includeHiddenNodes || !n.hidden);
    if (isVisible && (!optionNodeIds || optionNodeIds.has(n.id))) {
      fitViewNodes.set(n.id, n);
    }
  });
  return fitViewNodes;
}
async function fitViewport({ nodes, width, height, panZoom, minZoom, maxZoom }, options) {
  if (nodes.size === 0) {
    return Promise.resolve(true);
  }
  const nodesToFit = getFitViewNodes(nodes, options);
  const bounds = getInternalNodesBounds(nodesToFit);
  const viewport = getViewportForBounds(bounds, width, height, options?.minZoom ?? minZoom, options?.maxZoom ?? maxZoom, options?.padding ?? 0.1);
  await panZoom.setViewport(viewport, { duration: options?.duration });
  return Promise.resolve(true);
}
async function getElementsToRemove({ nodesToRemove = [], edgesToRemove = [], nodes, edges, onBeforeDelete }) {
  const nodeIds = new Set(nodesToRemove.map((node) => node.id));
  const matchingNodes = [];
  for (const node of nodes) {
    if (node.deletable === false) {
      continue;
    }
    const isIncluded = nodeIds.has(node.id);
    const parentHit = !isIncluded && node.parentId && matchingNodes.find((n) => n.id === node.parentId);
    if (isIncluded || parentHit) {
      matchingNodes.push(node);
    }
  }
  const edgeIds = new Set(edgesToRemove.map((edge) => edge.id));
  const deletableEdges = edges.filter((edge) => edge.deletable !== false);
  const connectedEdges = getConnectedEdges(matchingNodes, deletableEdges);
  const matchingEdges = connectedEdges;
  for (const edge of deletableEdges) {
    const isIncluded = edgeIds.has(edge.id);
    if (isIncluded && !matchingEdges.find((e) => e.id === edge.id)) {
      matchingEdges.push(edge);
    }
  }
  if (!onBeforeDelete) {
    return {
      edges: matchingEdges,
      nodes: matchingNodes
    };
  }
  const onBeforeDeleteResult = await onBeforeDelete({
    nodes: matchingNodes,
    edges: matchingEdges
  });
  if (typeof onBeforeDeleteResult === "boolean") {
    return onBeforeDeleteResult ? { edges: matchingEdges, nodes: matchingNodes } : { edges: [], nodes: [] };
  }
  return onBeforeDeleteResult;
}
const clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);
const clampPosition = (position = { x: 0, y: 0 }, extent, dimensions) => ({
  x: clamp(position.x, extent[0][0], extent[1][0] - (dimensions?.width ?? 0)),
  y: clamp(position.y, extent[0][1], extent[1][1] - (dimensions?.height ?? 0))
});
function clampPositionToParent(childPosition, childDimensions, parent) {
  const { width: parentWidth, height: parentHeight } = getNodeDimensions(parent);
  const { x: parentX, y: parentY } = parent.internals.positionAbsolute;
  return clampPosition(childPosition, [
    [parentX, parentY],
    [parentX + parentWidth, parentY + parentHeight]
  ], childDimensions);
}
const getBoundsOfBoxes = (box1, box2) => ({
  x: Math.min(box1.x, box2.x),
  y: Math.min(box1.y, box2.y),
  x2: Math.max(box1.x2, box2.x2),
  y2: Math.max(box1.y2, box2.y2)
});
const rectToBox = ({ x, y, width, height }) => ({
  x,
  y,
  x2: x + width,
  y2: y + height
});
const boxToRect = ({ x, y, x2, y2 }) => ({
  x,
  y,
  width: x2 - x,
  height: y2 - y
});
const nodeToRect = (node, nodeOrigin = [0, 0]) => {
  const { x, y } = isInternalNodeBase(node) ? node.internals.positionAbsolute : getNodePositionWithOrigin(node, nodeOrigin);
  return {
    x,
    y,
    width: node.measured?.width ?? node.width ?? node.initialWidth ?? 0,
    height: node.measured?.height ?? node.height ?? node.initialHeight ?? 0
  };
};
const nodeToBox = (node, nodeOrigin = [0, 0]) => {
  const { x, y } = isInternalNodeBase(node) ? node.internals.positionAbsolute : getNodePositionWithOrigin(node, nodeOrigin);
  return {
    x,
    y,
    x2: x + (node.measured?.width ?? node.width ?? node.initialWidth ?? 0),
    y2: y + (node.measured?.height ?? node.height ?? node.initialHeight ?? 0)
  };
};
const getBoundsOfRects = (rect1, rect2) => boxToRect(getBoundsOfBoxes(rectToBox(rect1), rectToBox(rect2)));
const getOverlappingArea = (rectA, rectB) => {
  const xOverlap = Math.max(0, Math.min(rectA.x + rectA.width, rectB.x + rectB.width) - Math.max(rectA.x, rectB.x));
  const yOverlap = Math.max(0, Math.min(rectA.y + rectA.height, rectB.y + rectB.height) - Math.max(rectA.y, rectB.y));
  return Math.ceil(xOverlap * yOverlap);
};
const isNumeric = (n) => !isNaN(n) && isFinite(n);
const devWarn = (id2, message) => {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[React Flow]: ${message} Help: https://reactflow.dev/error#${id2}`);
  }
};
const snapPosition = (position, snapGrid = [1, 1]) => {
  return {
    x: snapGrid[0] * Math.round(position.x / snapGrid[0]),
    y: snapGrid[1] * Math.round(position.y / snapGrid[1])
  };
};
const pointToRendererPoint = ({ x, y }, [tx, ty, tScale], snapToGrid = false, snapGrid = [1, 1]) => {
  const position = {
    x: (x - tx) / tScale,
    y: (y - ty) / tScale
  };
  return snapToGrid ? snapPosition(position, snapGrid) : position;
};
const rendererPointToPoint = ({ x, y }, [tx, ty, tScale]) => {
  return {
    x: x * tScale + tx,
    y: y * tScale + ty
  };
};
function parsePadding(padding, viewport) {
  if (typeof padding === "number") {
    return Math.floor((viewport - viewport / (1 + padding)) * 0.5);
  }
  if (typeof padding === "string" && padding.endsWith("px")) {
    const paddingValue = parseFloat(padding);
    if (!Number.isNaN(paddingValue)) {
      return Math.floor(paddingValue);
    }
  }
  if (typeof padding === "string" && padding.endsWith("%")) {
    const paddingValue = parseFloat(padding);
    if (!Number.isNaN(paddingValue)) {
      return Math.floor(viewport * paddingValue * 0.01);
    }
  }
  console.error(`[React Flow] The padding value "${padding}" is invalid. Please provide a number or a string with a valid unit (px or %).`);
  return 0;
}
function parsePaddings(padding, width, height) {
  if (typeof padding === "string" || typeof padding === "number") {
    const paddingY = parsePadding(padding, height);
    const paddingX = parsePadding(padding, width);
    return {
      top: paddingY,
      right: paddingX,
      bottom: paddingY,
      left: paddingX,
      x: paddingX * 2,
      y: paddingY * 2
    };
  }
  if (typeof padding === "object") {
    const top = parsePadding(padding.top ?? padding.y ?? 0, height);
    const bottom = parsePadding(padding.bottom ?? padding.y ?? 0, height);
    const left = parsePadding(padding.left ?? padding.x ?? 0, width);
    const right = parsePadding(padding.right ?? padding.x ?? 0, width);
    return { top, right, bottom, left, x: left + right, y: top + bottom };
  }
  return { top: 0, right: 0, bottom: 0, left: 0, x: 0, y: 0 };
}
function calculateAppliedPaddings(bounds, x, y, zoom, width, height) {
  const { x: left, y: top } = rendererPointToPoint(bounds, [x, y, zoom]);
  const { x: boundRight, y: boundBottom } = rendererPointToPoint({ x: bounds.x + bounds.width, y: bounds.y + bounds.height }, [x, y, zoom]);
  const right = width - boundRight;
  const bottom = height - boundBottom;
  return {
    left: Math.floor(left),
    top: Math.floor(top),
    right: Math.floor(right),
    bottom: Math.floor(bottom)
  };
}
const getViewportForBounds = (bounds, width, height, minZoom, maxZoom, padding) => {
  const p = parsePaddings(padding, width, height);
  const xZoom = (width - p.x) / bounds.width;
  const yZoom = (height - p.y) / bounds.height;
  const zoom = Math.min(xZoom, yZoom);
  const clampedZoom = clamp(zoom, minZoom, maxZoom);
  const boundsCenterX = bounds.x + bounds.width / 2;
  const boundsCenterY = bounds.y + bounds.height / 2;
  const x = width / 2 - boundsCenterX * clampedZoom;
  const y = height / 2 - boundsCenterY * clampedZoom;
  const newPadding = calculateAppliedPaddings(bounds, x, y, clampedZoom, width, height);
  const offset = {
    left: Math.min(newPadding.left - p.left, 0),
    top: Math.min(newPadding.top - p.top, 0),
    right: Math.min(newPadding.right - p.right, 0),
    bottom: Math.min(newPadding.bottom - p.bottom, 0)
  };
  return {
    x: x - offset.left + offset.right,
    y: y - offset.top + offset.bottom,
    zoom: clampedZoom
  };
};
const isMacOs = () => typeof navigator !== "undefined" && navigator?.userAgent?.indexOf("Mac") >= 0;
function isCoordinateExtent(extent) {
  return extent !== void 0 && extent !== "parent";
}
function getNodeDimensions(node) {
  return {
    width: node.measured?.width ?? node.width ?? node.initialWidth ?? 0,
    height: node.measured?.height ?? node.height ?? node.initialHeight ?? 0
  };
}
function nodeHasDimensions(node) {
  return (node.measured?.width ?? node.width ?? node.initialWidth) !== void 0 && (node.measured?.height ?? node.height ?? node.initialHeight) !== void 0;
}
function withResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const getDimensions = (node) => ({
  width: node.offsetWidth,
  height: node.offsetHeight
});
const getHandleBounds = (type, nodeElement, nodeBounds, zoom, nodeId) => {
  const handles = nodeElement.querySelectorAll(`.${type}`);
  if (!handles || !handles.length) {
    return null;
  }
  return Array.from(handles).map((handle) => {
    const handleBounds = handle.getBoundingClientRect();
    return {
      id: handle.getAttribute("data-handleid"),
      type,
      nodeId,
      position: handle.getAttribute("data-handlepos"),
      x: (handleBounds.left - nodeBounds.left) / zoom,
      y: (handleBounds.top - nodeBounds.top) / zoom,
      ...getDimensions(handle)
    };
  });
};
function getBezierEdgeCenter({ sourceX, sourceY, targetX, targetY, sourceControlX, sourceControlY, targetControlX, targetControlY }) {
  const centerX = sourceX * 0.125 + sourceControlX * 0.375 + targetControlX * 0.375 + targetX * 0.125;
  const centerY = sourceY * 0.125 + sourceControlY * 0.375 + targetControlY * 0.375 + targetY * 0.125;
  const offsetX = Math.abs(centerX - sourceX);
  const offsetY = Math.abs(centerY - sourceY);
  return [centerX, centerY, offsetX, offsetY];
}
function calculateControlOffset(distance2, curvature) {
  if (distance2 >= 0) {
    return 0.5 * distance2;
  }
  return curvature * 25 * Math.sqrt(-distance2);
}
function getControlWithCurvature({ pos, x1, y1, x2, y2, c }) {
  switch (pos) {
    case Position.Left:
      return [x1 - calculateControlOffset(x1 - x2, c), y1];
    case Position.Right:
      return [x1 + calculateControlOffset(x2 - x1, c), y1];
    case Position.Top:
      return [x1, y1 - calculateControlOffset(y1 - y2, c)];
    case Position.Bottom:
      return [x1, y1 + calculateControlOffset(y2 - y1, c)];
  }
}
function getBezierPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top, curvature = 0.25 }) {
  const [sourceControlX, sourceControlY] = getControlWithCurvature({
    pos: sourcePosition,
    x1: sourceX,
    y1: sourceY,
    x2: targetX,
    y2: targetY,
    c: curvature
  });
  const [targetControlX, targetControlY] = getControlWithCurvature({
    pos: targetPosition,
    x1: targetX,
    y1: targetY,
    x2: sourceX,
    y2: sourceY,
    c: curvature
  });
  const [labelX, labelY, offsetX, offsetY] = getBezierEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceControlX,
    sourceControlY,
    targetControlX,
    targetControlY
  });
  return [
    `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
    labelX,
    labelY,
    offsetX,
    offsetY
  ];
}
function getEdgeCenter({ sourceX, sourceY, targetX, targetY }) {
  const xOffset = Math.abs(targetX - sourceX) / 2;
  const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset;
  const yOffset = Math.abs(targetY - sourceY) / 2;
  const centerY = targetY < sourceY ? targetY + yOffset : targetY - yOffset;
  return [centerX, centerY, xOffset, yOffset];
}
function getElevatedEdgeZIndex({ sourceNode, targetNode, selected = false, zIndex = 0, elevateOnSelect = false }) {
  if (!elevateOnSelect) {
    return zIndex;
  }
  const edgeOrConnectedNodeSelected = selected || targetNode.selected || sourceNode.selected;
  const selectedZIndex = Math.max(sourceNode.internals.z || 0, targetNode.internals.z || 0, 1e3);
  return zIndex + (edgeOrConnectedNodeSelected ? selectedZIndex : 0);
}
function isEdgeVisible({ sourceNode, targetNode, width, height, transform }) {
  const edgeBox = getBoundsOfBoxes(nodeToBox(sourceNode), nodeToBox(targetNode));
  if (edgeBox.x === edgeBox.x2) {
    edgeBox.x2 += 1;
  }
  if (edgeBox.y === edgeBox.y2) {
    edgeBox.y2 += 1;
  }
  const viewRect = {
    x: -transform[0] / transform[2],
    y: -transform[1] / transform[2],
    width: width / transform[2],
    height: height / transform[2]
  };
  return getOverlappingArea(viewRect, boxToRect(edgeBox)) > 0;
}
const getEdgeId = ({ source, sourceHandle, target, targetHandle }) => `xy-edge__${source}${sourceHandle || ""}-${target}${targetHandle || ""}`;
const connectionExists = (edge, edges) => {
  return edges.some((el) => el.source === edge.source && el.target === edge.target && (el.sourceHandle === edge.sourceHandle || !el.sourceHandle && !edge.sourceHandle) && (el.targetHandle === edge.targetHandle || !el.targetHandle && !edge.targetHandle));
};
const addEdge = (edgeParams, edges) => {
  if (!edgeParams.source || !edgeParams.target) {
    devWarn("006", errorMessages["error006"]());
    return edges;
  }
  let edge;
  if (isEdgeBase(edgeParams)) {
    edge = { ...edgeParams };
  } else {
    edge = {
      ...edgeParams,
      id: getEdgeId(edgeParams)
    };
  }
  if (connectionExists(edge, edges)) {
    return edges;
  }
  if (edge.sourceHandle === null) {
    delete edge.sourceHandle;
  }
  if (edge.targetHandle === null) {
    delete edge.targetHandle;
  }
  return edges.concat(edge);
};
function getStraightPath({ sourceX, sourceY, targetX, targetY }) {
  const [labelX, labelY, offsetX, offsetY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY
  });
  return [`M ${sourceX},${sourceY}L ${targetX},${targetY}`, labelX, labelY, offsetX, offsetY];
}
const handleDirections = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 }
};
const getDirection = ({ source, sourcePosition = Position.Bottom, target }) => {
  if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
    return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  }
  return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 };
};
const distance = (a, b) => Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
function getPoints({ source, sourcePosition = Position.Bottom, target, targetPosition = Position.Top, center, offset }) {
  const sourceDir = handleDirections[sourcePosition];
  const targetDir = handleDirections[targetPosition];
  const sourceGapped = { x: source.x + sourceDir.x * offset, y: source.y + sourceDir.y * offset };
  const targetGapped = { x: target.x + targetDir.x * offset, y: target.y + targetDir.y * offset };
  const dir = getDirection({
    source: sourceGapped,
    sourcePosition,
    target: targetGapped
  });
  const dirAccessor = dir.x !== 0 ? "x" : "y";
  const currDir = dir[dirAccessor];
  let points = [];
  let centerX, centerY;
  const sourceGapOffset = { x: 0, y: 0 };
  const targetGapOffset = { x: 0, y: 0 };
  const [defaultCenterX, defaultCenterY, defaultOffsetX, defaultOffsetY] = getEdgeCenter({
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y
  });
  if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
    centerX = center.x ?? defaultCenterX;
    centerY = center.y ?? defaultCenterY;
    const verticalSplit = [
      { x: centerX, y: sourceGapped.y },
      { x: centerX, y: targetGapped.y }
    ];
    const horizontalSplit = [
      { x: sourceGapped.x, y: centerY },
      { x: targetGapped.x, y: centerY }
    ];
    if (sourceDir[dirAccessor] === currDir) {
      points = dirAccessor === "x" ? verticalSplit : horizontalSplit;
    } else {
      points = dirAccessor === "x" ? horizontalSplit : verticalSplit;
    }
  } else {
    const sourceTarget = [{ x: sourceGapped.x, y: targetGapped.y }];
    const targetSource = [{ x: targetGapped.x, y: sourceGapped.y }];
    if (dirAccessor === "x") {
      points = sourceDir.x === currDir ? targetSource : sourceTarget;
    } else {
      points = sourceDir.y === currDir ? sourceTarget : targetSource;
    }
    if (sourcePosition === targetPosition) {
      const diff = Math.abs(source[dirAccessor] - target[dirAccessor]);
      if (diff <= offset) {
        const gapOffset = Math.min(offset - 1, offset - diff);
        if (sourceDir[dirAccessor] === currDir) {
          sourceGapOffset[dirAccessor] = (sourceGapped[dirAccessor] > source[dirAccessor] ? -1 : 1) * gapOffset;
        } else {
          targetGapOffset[dirAccessor] = (targetGapped[dirAccessor] > target[dirAccessor] ? -1 : 1) * gapOffset;
        }
      }
    }
    if (sourcePosition !== targetPosition) {
      const dirAccessorOpposite = dirAccessor === "x" ? "y" : "x";
      const isSameDir = sourceDir[dirAccessor] === targetDir[dirAccessorOpposite];
      const sourceGtTargetOppo = sourceGapped[dirAccessorOpposite] > targetGapped[dirAccessorOpposite];
      const sourceLtTargetOppo = sourceGapped[dirAccessorOpposite] < targetGapped[dirAccessorOpposite];
      const flipSourceTarget = sourceDir[dirAccessor] === 1 && (!isSameDir && sourceGtTargetOppo || isSameDir && sourceLtTargetOppo) || sourceDir[dirAccessor] !== 1 && (!isSameDir && sourceLtTargetOppo || isSameDir && sourceGtTargetOppo);
      if (flipSourceTarget) {
        points = dirAccessor === "x" ? sourceTarget : targetSource;
      }
    }
    const sourceGapPoint = { x: sourceGapped.x + sourceGapOffset.x, y: sourceGapped.y + sourceGapOffset.y };
    const targetGapPoint = { x: targetGapped.x + targetGapOffset.x, y: targetGapped.y + targetGapOffset.y };
    const maxXDistance = Math.max(Math.abs(sourceGapPoint.x - points[0].x), Math.abs(targetGapPoint.x - points[0].x));
    const maxYDistance = Math.max(Math.abs(sourceGapPoint.y - points[0].y), Math.abs(targetGapPoint.y - points[0].y));
    if (maxXDistance >= maxYDistance) {
      centerX = (sourceGapPoint.x + targetGapPoint.x) / 2;
      centerY = points[0].y;
    } else {
      centerX = points[0].x;
      centerY = (sourceGapPoint.y + targetGapPoint.y) / 2;
    }
  }
  const pathPoints = [
    source,
    { x: sourceGapped.x + sourceGapOffset.x, y: sourceGapped.y + sourceGapOffset.y },
    ...points,
    { x: targetGapped.x + targetGapOffset.x, y: targetGapped.y + targetGapOffset.y },
    target
  ];
  return [pathPoints, centerX, centerY, defaultOffsetX, defaultOffsetY];
}
function getBend(a, b, c, size) {
  const bendSize = Math.min(distance(a, b) / 2, distance(b, c) / 2, size);
  const { x, y } = b;
  if (a.x === x && x === c.x || a.y === y && y === c.y) {
    return `L${x} ${y}`;
  }
  if (a.y === y) {
    const xDir2 = a.x < c.x ? -1 : 1;
    const yDir2 = a.y < c.y ? 1 : -1;
    return `L ${x + bendSize * xDir2},${y}Q ${x},${y} ${x},${y + bendSize * yDir2}`;
  }
  const xDir = a.x < c.x ? 1 : -1;
  const yDir = a.y < c.y ? -1 : 1;
  return `L ${x},${y + bendSize * yDir}Q ${x},${y} ${x + bendSize * xDir},${y}`;
}
function getSmoothStepPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top, borderRadius = 5, centerX, centerY, offset = 20 }) {
  const [points, labelX, labelY, offsetX, offsetY] = getPoints({
    source: { x: sourceX, y: sourceY },
    sourcePosition,
    target: { x: targetX, y: targetY },
    targetPosition,
    center: { x: centerX, y: centerY },
    offset
  });
  const path = points.reduce((res, p, i) => {
    let segment = "";
    if (i > 0 && i < points.length - 1) {
      segment = getBend(points[i - 1], p, points[i + 1], borderRadius);
    } else {
      segment = `${i === 0 ? "M" : "L"}${p.x} ${p.y}`;
    }
    res += segment;
    return res;
  }, "");
  return [path, labelX, labelY, offsetX, offsetY];
}
function isNodeInitialized(node) {
  return node && !!(node.internals.handleBounds || node.handles?.length) && !!(node.measured.width || node.width || node.initialWidth);
}
function getEdgePosition(params) {
  const { sourceNode, targetNode } = params;
  if (!isNodeInitialized(sourceNode) || !isNodeInitialized(targetNode)) {
    return null;
  }
  const sourceHandleBounds = sourceNode.internals.handleBounds || toHandleBounds(sourceNode.handles);
  const targetHandleBounds = targetNode.internals.handleBounds || toHandleBounds(targetNode.handles);
  const sourceHandle = getHandle$1(sourceHandleBounds?.source ?? [], params.sourceHandle);
  const targetHandle = getHandle$1(
    // when connection type is loose we can define all handles as sources and connect source -> source
    params.connectionMode === ConnectionMode.Strict ? targetHandleBounds?.target ?? [] : (targetHandleBounds?.target ?? []).concat(targetHandleBounds?.source ?? []),
    params.targetHandle
  );
  if (!sourceHandle || !targetHandle) {
    params.onError?.("008", errorMessages["error008"](!sourceHandle ? "source" : "target", {
      id: params.id,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle
    }));
    return null;
  }
  const sourcePosition = sourceHandle?.position || Position.Bottom;
  const targetPosition = targetHandle?.position || Position.Top;
  const source = getHandlePosition(sourceNode, sourceHandle, sourcePosition);
  const target = getHandlePosition(targetNode, targetHandle, targetPosition);
  return {
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y,
    sourcePosition,
    targetPosition
  };
}
function toHandleBounds(handles) {
  if (!handles) {
    return null;
  }
  const source = [];
  const target = [];
  for (const handle of handles) {
    handle.width = handle.width ?? 1;
    handle.height = handle.height ?? 1;
    if (handle.type === "source") {
      source.push(handle);
    } else if (handle.type === "target") {
      target.push(handle);
    }
  }
  return {
    source,
    target
  };
}
function getHandlePosition(node, handle, fallbackPosition = Position.Left, center = false) {
  const x = (handle?.x ?? 0) + node.internals.positionAbsolute.x;
  const y = (handle?.y ?? 0) + node.internals.positionAbsolute.y;
  const { width, height } = handle ?? getNodeDimensions(node);
  if (center) {
    return { x: x + width / 2, y: y + height / 2 };
  }
  const position = handle?.position ?? fallbackPosition;
  switch (position) {
    case Position.Top:
      return { x: x + width / 2, y };
    case Position.Right:
      return { x: x + width, y: y + height / 2 };
    case Position.Bottom:
      return { x: x + width / 2, y: y + height };
    case Position.Left:
      return { x, y: y + height / 2 };
  }
}
function getHandle$1(bounds, handleId) {
  if (!bounds) {
    return null;
  }
  return (!handleId ? bounds[0] : bounds.find((d) => d.id === handleId)) || null;
}
function getMarkerId(marker, id2) {
  if (!marker) {
    return "";
  }
  if (typeof marker === "string") {
    return marker;
  }
  const idPrefix = id2 ? `${id2}__` : "";
  return `${idPrefix}${Object.keys(marker).sort().map((key2) => `${key2}=${marker[key2]}`).join("&")}`;
}
function createMarkerIds(edges, { id: id2, defaultColor, defaultMarkerStart, defaultMarkerEnd }) {
  const ids = /* @__PURE__ */ new Set();
  return edges.reduce((markers, edge) => {
    [edge.markerStart || defaultMarkerStart, edge.markerEnd || defaultMarkerEnd].forEach((marker) => {
      if (marker && typeof marker === "object") {
        const markerId = getMarkerId(marker, id2);
        if (!ids.has(markerId)) {
          markers.push({ id: markerId, color: marker.color || defaultColor, ...marker });
          ids.add(markerId);
        }
      }
    });
    return markers;
  }, []).sort((a, b) => a.id.localeCompare(b.id));
}
const defaultOptions = {
  nodeOrigin: [0, 0],
  nodeExtent: infiniteExtent,
  elevateNodesOnSelect: true,
  defaults: {}
};
const adoptUserNodesDefaultOptions = {
  ...defaultOptions,
  checkEquality: true
};
function mergeObjects(base, incoming) {
  const result = { ...base };
  for (const key2 in incoming) {
    if (incoming[key2] !== void 0) {
      result[key2] = incoming[key2];
    }
  }
  return result;
}
function updateAbsolutePositions(nodeLookup, parentLookup, options) {
  const _options = mergeObjects(defaultOptions, options);
  for (const node of nodeLookup.values()) {
    if (node.parentId) {
      updateChildNode(node, nodeLookup, parentLookup, _options);
    } else {
      const positionWithOrigin = getNodePositionWithOrigin(node, _options.nodeOrigin);
      const extent = isCoordinateExtent(node.extent) ? node.extent : _options.nodeExtent;
      const clampedPosition = clampPosition(positionWithOrigin, extent, getNodeDimensions(node));
      node.internals.positionAbsolute = clampedPosition;
    }
  }
}
function adoptUserNodes(nodes, nodeLookup, parentLookup, options) {
  const _options = mergeObjects(adoptUserNodesDefaultOptions, options);
  let nodesInitialized = nodes.length > 0;
  const tmpLookup = new Map(nodeLookup);
  const selectedNodeZ = _options?.elevateNodesOnSelect ? 1e3 : 0;
  nodeLookup.clear();
  parentLookup.clear();
  for (const userNode of nodes) {
    let internalNode = tmpLookup.get(userNode.id);
    if (_options.checkEquality && userNode === internalNode?.internals.userNode) {
      nodeLookup.set(userNode.id, internalNode);
    } else {
      const positionWithOrigin = getNodePositionWithOrigin(userNode, _options.nodeOrigin);
      const extent = isCoordinateExtent(userNode.extent) ? userNode.extent : _options.nodeExtent;
      const clampedPosition = clampPosition(positionWithOrigin, extent, getNodeDimensions(userNode));
      internalNode = {
        ..._options.defaults,
        ...userNode,
        measured: {
          width: userNode.measured?.width,
          height: userNode.measured?.height
        },
        internals: {
          positionAbsolute: clampedPosition,
          // if user re-initializes the node or removes `measured` for whatever reason, we reset the handleBounds so that the node gets re-measured
          handleBounds: !userNode.measured ? void 0 : internalNode?.internals.handleBounds,
          z: calculateZ(userNode, selectedNodeZ),
          userNode
        }
      };
      nodeLookup.set(userNode.id, internalNode);
    }
    if ((internalNode.measured === void 0 || internalNode.measured.width === void 0 || internalNode.measured.height === void 0) && !internalNode.hidden) {
      nodesInitialized = false;
    }
    if (userNode.parentId) {
      updateChildNode(internalNode, nodeLookup, parentLookup, options);
    }
  }
  return nodesInitialized;
}
function updateParentLookup(node, parentLookup) {
  if (!node.parentId) {
    return;
  }
  const childNodes = parentLookup.get(node.parentId);
  if (childNodes) {
    childNodes.set(node.id, node);
  } else {
    parentLookup.set(node.parentId, /* @__PURE__ */ new Map([[node.id, node]]));
  }
}
function updateChildNode(node, nodeLookup, parentLookup, options) {
  const { elevateNodesOnSelect, nodeOrigin, nodeExtent } = mergeObjects(defaultOptions, options);
  const parentId = node.parentId;
  const parentNode = nodeLookup.get(parentId);
  if (!parentNode) {
    console.warn(`Parent node ${parentId} not found. Please make sure that parent nodes are in front of their child nodes in the nodes array.`);
    return;
  }
  updateParentLookup(node, parentLookup);
  const selectedNodeZ = elevateNodesOnSelect ? 1e3 : 0;
  const { x, y, z } = calculateChildXYZ(node, parentNode, nodeOrigin, nodeExtent, selectedNodeZ);
  const { positionAbsolute } = node.internals;
  const positionChanged = x !== positionAbsolute.x || y !== positionAbsolute.y;
  if (positionChanged || z !== node.internals.z) {
    nodeLookup.set(node.id, {
      ...node,
      internals: {
        ...node.internals,
        positionAbsolute: positionChanged ? { x, y } : positionAbsolute,
        z
      }
    });
  }
}
function calculateZ(node, selectedNodeZ) {
  return (isNumeric(node.zIndex) ? node.zIndex : 0) + (node.selected ? selectedNodeZ : 0);
}
function calculateChildXYZ(childNode, parentNode, nodeOrigin, nodeExtent, selectedNodeZ) {
  const { x: parentX, y: parentY } = parentNode.internals.positionAbsolute;
  const childDimensions = getNodeDimensions(childNode);
  const positionWithOrigin = getNodePositionWithOrigin(childNode, nodeOrigin);
  const clampedPosition = isCoordinateExtent(childNode.extent) ? clampPosition(positionWithOrigin, childNode.extent, childDimensions) : positionWithOrigin;
  let absolutePosition = clampPosition({ x: parentX + clampedPosition.x, y: parentY + clampedPosition.y }, nodeExtent, childDimensions);
  if (childNode.extent === "parent") {
    absolutePosition = clampPositionToParent(absolutePosition, childDimensions, parentNode);
  }
  const childZ = calculateZ(childNode, selectedNodeZ);
  const parentZ = parentNode.internals.z ?? 0;
  return {
    x: absolutePosition.x,
    y: absolutePosition.y,
    z: parentZ > childZ ? parentZ : childZ
  };
}
function handleExpandParent(children2, nodeLookup, parentLookup, nodeOrigin = [0, 0]) {
  const changes = [];
  const parentExpansions = /* @__PURE__ */ new Map();
  for (const child of children2) {
    const parent = nodeLookup.get(child.parentId);
    if (!parent) {
      continue;
    }
    const parentRect = parentExpansions.get(child.parentId)?.expandedRect ?? nodeToRect(parent);
    const expandedRect = getBoundsOfRects(parentRect, child.rect);
    parentExpansions.set(child.parentId, { expandedRect, parent });
  }
  if (parentExpansions.size > 0) {
    parentExpansions.forEach(({ expandedRect, parent }, parentId) => {
      const positionAbsolute = parent.internals.positionAbsolute;
      const dimensions = getNodeDimensions(parent);
      const origin = parent.origin ?? nodeOrigin;
      const xChange = expandedRect.x < positionAbsolute.x ? Math.round(Math.abs(positionAbsolute.x - expandedRect.x)) : 0;
      const yChange = expandedRect.y < positionAbsolute.y ? Math.round(Math.abs(positionAbsolute.y - expandedRect.y)) : 0;
      const newWidth = Math.max(dimensions.width, Math.round(expandedRect.width));
      const newHeight = Math.max(dimensions.height, Math.round(expandedRect.height));
      const widthChange = (newWidth - dimensions.width) * origin[0];
      const heightChange = (newHeight - dimensions.height) * origin[1];
      if (xChange > 0 || yChange > 0 || widthChange || heightChange) {
        changes.push({
          id: parentId,
          type: "position",
          position: {
            x: parent.position.x - xChange + widthChange,
            y: parent.position.y - yChange + heightChange
          }
        });
        parentLookup.get(parentId)?.forEach((childNode) => {
          if (!children2.some((child) => child.id === childNode.id)) {
            changes.push({
              id: childNode.id,
              type: "position",
              position: {
                x: childNode.position.x + xChange,
                y: childNode.position.y + yChange
              }
            });
          }
        });
      }
      if (dimensions.width < expandedRect.width || dimensions.height < expandedRect.height || xChange || yChange) {
        changes.push({
          id: parentId,
          type: "dimensions",
          setAttributes: true,
          dimensions: {
            width: newWidth + (xChange ? origin[0] * xChange - widthChange : 0),
            height: newHeight + (yChange ? origin[1] * yChange - heightChange : 0)
          }
        });
      }
    });
  }
  return changes;
}
function updateNodeInternals(updates, nodeLookup, parentLookup, domNode, nodeOrigin, nodeExtent) {
  const viewportNode = domNode?.querySelector(".xyflow__viewport");
  let updatedInternals = false;
  if (!viewportNode) {
    return { changes: [], updatedInternals };
  }
  const changes = [];
  const style = window.getComputedStyle(viewportNode);
  const { m22: zoom } = new window.DOMMatrixReadOnly(style.transform);
  const parentExpandChildren = [];
  for (const update of updates.values()) {
    const node = nodeLookup.get(update.id);
    if (!node) {
      continue;
    }
    if (node.hidden) {
      nodeLookup.set(node.id, {
        ...node,
        internals: {
          ...node.internals,
          handleBounds: void 0
        }
      });
      updatedInternals = true;
      continue;
    }
    const dimensions = getDimensions(update.nodeElement);
    const dimensionChanged = node.measured.width !== dimensions.width || node.measured.height !== dimensions.height;
    const doUpdate = !!(dimensions.width && dimensions.height && (dimensionChanged || !node.internals.handleBounds || update.force));
    if (doUpdate) {
      const nodeBounds = update.nodeElement.getBoundingClientRect();
      const extent = isCoordinateExtent(node.extent) ? node.extent : nodeExtent;
      let { positionAbsolute } = node.internals;
      if (node.parentId && node.extent === "parent") {
        positionAbsolute = clampPositionToParent(positionAbsolute, dimensions, nodeLookup.get(node.parentId));
      } else if (extent) {
        positionAbsolute = clampPosition(positionAbsolute, extent, dimensions);
      }
      const newNode = {
        ...node,
        measured: dimensions,
        internals: {
          ...node.internals,
          positionAbsolute,
          handleBounds: {
            source: getHandleBounds("source", update.nodeElement, nodeBounds, zoom, node.id),
            target: getHandleBounds("target", update.nodeElement, nodeBounds, zoom, node.id)
          }
        }
      };
      nodeLookup.set(node.id, newNode);
      if (node.parentId) {
        updateChildNode(newNode, nodeLookup, parentLookup, { nodeOrigin });
      }
      updatedInternals = true;
      if (dimensionChanged) {
        changes.push({
          id: node.id,
          type: "dimensions",
          dimensions
        });
        if (node.expandParent && node.parentId) {
          parentExpandChildren.push({
            id: node.id,
            parentId: node.parentId,
            rect: nodeToRect(newNode, nodeOrigin)
          });
        }
      }
    }
  }
  if (parentExpandChildren.length > 0) {
    const parentExpandChanges = handleExpandParent(parentExpandChildren, nodeLookup, parentLookup, nodeOrigin);
    changes.push(...parentExpandChanges);
  }
  return { changes, updatedInternals };
}
async function panBy({ delta, panZoom, transform, translateExtent, width, height }) {
  if (!panZoom || !delta.x && !delta.y) {
    return Promise.resolve(false);
  }
  const nextViewport = await panZoom.setViewportConstrained({
    x: transform[0] + delta.x,
    y: transform[1] + delta.y,
    zoom: transform[2]
  }, [
    [0, 0],
    [width, height]
  ], translateExtent);
  const transformChanged = !!nextViewport && (nextViewport.x !== transform[0] || nextViewport.y !== transform[1] || nextViewport.k !== transform[2]);
  return Promise.resolve(transformChanged);
}
function addConnectionToLookup(type, connection, connectionKey, connectionLookup, nodeId, handleId) {
  let key2 = nodeId;
  const nodeMap = connectionLookup.get(key2) || /* @__PURE__ */ new Map();
  connectionLookup.set(key2, nodeMap.set(connectionKey, connection));
  key2 = `${nodeId}-${type}`;
  const typeMap = connectionLookup.get(key2) || /* @__PURE__ */ new Map();
  connectionLookup.set(key2, typeMap.set(connectionKey, connection));
  if (handleId) {
    key2 = `${nodeId}-${type}-${handleId}`;
    const handleMap = connectionLookup.get(key2) || /* @__PURE__ */ new Map();
    connectionLookup.set(key2, handleMap.set(connectionKey, connection));
  }
}
function updateConnectionLookup(connectionLookup, edgeLookup, edges) {
  connectionLookup.clear();
  edgeLookup.clear();
  for (const edge of edges) {
    const { source: sourceNode, target: targetNode, sourceHandle = null, targetHandle = null } = edge;
    const connection = { edgeId: edge.id, source: sourceNode, target: targetNode, sourceHandle, targetHandle };
    const sourceKey = `${sourceNode}-${sourceHandle}--${targetNode}-${targetHandle}`;
    const targetKey = `${targetNode}-${targetHandle}--${sourceNode}-${sourceHandle}`;
    addConnectionToLookup("source", connection, targetKey, connectionLookup, sourceNode, sourceHandle);
    addConnectionToLookup("target", connection, sourceKey, connectionLookup, targetNode, targetHandle);
    edgeLookup.set(edge.id, edge);
  }
}
var ResizeControlVariant;
(function(ResizeControlVariant2) {
  ResizeControlVariant2["Line"] = "line";
  ResizeControlVariant2["Handle"] = "handle";
})(ResizeControlVariant || (ResizeControlVariant = {}));
function Handle($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let isTarget, isConnectable, handleId, connectionInProcess, connectingFrom, connectingTo, isPossibleEndHandle, valid;
    let id2 = fallback($$props["id"], void 0);
    let type = fallback($$props["type"], "source");
    let position = fallback($$props["position"], () => Position.Top, true);
    let style = fallback($$props["style"], void 0);
    let isValidConnection = fallback($$props["isValidConnection"], void 0);
    let onconnect = fallback($$props["onconnect"], void 0);
    let ondisconnect = fallback($$props["ondisconnect"], void 0);
    let isConnectableProp = fallback($$props["isConnectable"], void 0);
    let className = fallback($$props["class"], void 0);
    const nodeId = getContext("svelteflow__node_id");
    const connectable = getContext("svelteflow__node_connectable");
    const store = useStore();
    const {
      connectionMode,
      domNode,
      nodeLookup,
      connectionRadius,
      viewport,
      isValidConnection: isValidConnectionStore,
      lib,
      addEdge: addEdge2,
      onedgecreate,
      panBy: panBy2,
      cancelConnection,
      updateConnection,
      autoPanOnConnect,
      edges,
      connectionLookup,
      onconnect: onConnectAction,
      onconnectstart: onConnectStartAction,
      onconnectend: onConnectEndAction,
      flowId,
      connection
    } = store;
    let prevConnections = null;
    let connections;
    isTarget = type === "target";
    isConnectable = isConnectableProp !== void 0 ? isConnectableProp : store_get($$store_subs ??= {}, "$connectable", connectable);
    handleId = id2 || null;
    if (onconnect || ondisconnect) {
      store_get($$store_subs ??= {}, "$edges", edges);
      connections = store_get($$store_subs ??= {}, "$connectionLookup", connectionLookup).get(`${nodeId}-${type}${id2 ? `-${id2}` : ""}`);
    }
    {
      if (prevConnections && !areConnectionMapsEqual(connections, prevConnections)) {
        const _connections = connections ?? /* @__PURE__ */ new Map();
        handleConnectionChange(prevConnections, _connections, ondisconnect);
        handleConnectionChange(_connections, prevConnections, onconnect);
      }
      prevConnections = connections ?? /* @__PURE__ */ new Map();
    }
    connectionInProcess = !!store_get($$store_subs ??= {}, "$connection", connection).fromHandle;
    connectingFrom = store_get($$store_subs ??= {}, "$connection", connection).fromHandle?.nodeId === nodeId && store_get($$store_subs ??= {}, "$connection", connection).fromHandle?.type === type && store_get($$store_subs ??= {}, "$connection", connection).fromHandle?.id === handleId;
    connectingTo = store_get($$store_subs ??= {}, "$connection", connection).toHandle?.nodeId === nodeId && store_get($$store_subs ??= {}, "$connection", connection).toHandle?.type === type && store_get($$store_subs ??= {}, "$connection", connection).toHandle?.id === handleId;
    isPossibleEndHandle = store_get($$store_subs ??= {}, "$connectionMode", connectionMode) === ConnectionMode.Strict ? store_get($$store_subs ??= {}, "$connection", connection).fromHandle?.type !== type : nodeId !== store_get($$store_subs ??= {}, "$connection", connection).fromHandle?.nodeId || handleId !== store_get($$store_subs ??= {}, "$connection", connection).fromHandle?.id;
    valid = connectingTo && store_get($$store_subs ??= {}, "$connection", connection).isValid;
    $$renderer2.push(`<div${attr("data-handleid", handleId)}${attr("data-nodeid", nodeId)}${attr("data-handlepos", position)}${attr("data-id", `${stringify(store_get($$store_subs ??= {}, "$flowId", flowId))}-${stringify(nodeId)}-${stringify(id2 || null)}-${stringify(type)}`)}${attr_class(
      clsx(cc([
        "svelte-flow__handle",
        `svelte-flow__handle-${position}`,
        "nodrag",
        "nopan",
        position,
        className
      ])),
      void 0,
      {
        "valid": valid,
        "connectingto": connectingTo,
        "connectingfrom": connectingFrom,
        "source": !isTarget,
        "target": isTarget,
        "connectablestart": isConnectable,
        "connectableend": isConnectable,
        "connectable": isConnectable,
        "connectionindicator": isConnectable && (!connectionInProcess || isPossibleEndHandle)
      }
    )}${attr_style(style)} role="button" tabindex="-1"><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, {
      id: id2,
      type,
      position,
      style,
      isValidConnection,
      onconnect,
      ondisconnect,
      isConnectable: isConnectableProp,
      class: className
    });
  });
}
function DefaultNode($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  rest_props($$sanitized_props, ["data", "targetPosition", "sourcePosition"]);
  $$renderer.component(($$renderer2) => {
    let data = fallback($$props["data"], () => ({ label: "Node" }), true);
    let targetPosition = fallback($$props["targetPosition"], void 0);
    let sourcePosition = fallback($$props["sourcePosition"], void 0);
    Handle($$renderer2, { type: "target", position: targetPosition ?? Position.Top });
    $$renderer2.push(`<!----> ${escape_html(data?.label)} `);
    Handle($$renderer2, { type: "source", position: sourcePosition ?? Position.Bottom });
    $$renderer2.push(`<!---->`);
    bind_props($$props, { data, targetPosition, sourcePosition });
  });
}
function InputNode($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  rest_props($$sanitized_props, ["data", "sourcePosition"]);
  $$renderer.component(($$renderer2) => {
    let data = fallback($$props["data"], () => ({ label: "Node" }), true);
    let sourcePosition = fallback($$props["sourcePosition"], void 0);
    $$renderer2.push(`<!---->${escape_html(data?.label)} `);
    Handle($$renderer2, { type: "source", position: sourcePosition ?? Position.Bottom });
    $$renderer2.push(`<!---->`);
    bind_props($$props, { data, sourcePosition });
  });
}
function OutputNode($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  rest_props($$sanitized_props, ["data", "targetPosition"]);
  $$renderer.component(($$renderer2) => {
    let data = fallback($$props["data"], () => ({ label: "Node" }), true);
    let targetPosition = fallback($$props["targetPosition"], void 0);
    $$renderer2.push(`<!---->${escape_html(data?.label)} `);
    Handle($$renderer2, { type: "target", position: targetPosition ?? Position.Top });
    $$renderer2.push(`<!---->`);
    bind_props($$props, { data, targetPosition });
  });
}
function GroupNode($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  rest_props($$sanitized_props, []);
}
function EdgeLabelRenderer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { domNode } = useStore();
    $$renderer2.push(`<div><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div>`);
  });
}
function useHandleEdgeSelect() {
  const { edgeLookup, selectionRect, selectionRectMode, multiselectionKeyPressed, addSelectedEdges, unselectNodesAndEdges, elementsSelectable } = useStore();
  return (id2) => {
    const edge = get$2(edgeLookup).get(id2);
    if (!edge) {
      console.warn("012", errorMessages["error012"](id2));
      return;
    }
    const selectable = edge.selectable || get$2(elementsSelectable) && typeof edge.selectable === "undefined";
    if (selectable) {
      selectionRect.set(null);
      selectionRectMode.set(null);
      if (!edge.selected) {
        addSelectedEdges([id2]);
      } else if (edge.selected && get$2(multiselectionKeyPressed)) {
        unselectNodesAndEdges({ nodes: [], edges: [edge] });
      }
    }
  };
}
function EdgeLabel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let style = fallback($$props["style"], void 0);
    let x = fallback($$props["x"], void 0);
    let y = fallback($$props["y"], void 0);
    useHandleEdgeSelect();
    getContext("svelteflow__edge_id");
    EdgeLabelRenderer($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="svelte-flow__edge-label"${attr_style("pointer-events: all;" + style, {
          transform: `translate(-50%, -50%) translate(${stringify(x)}px,${stringify(y)}px)`
        })} role="button" tabindex="-1"><!--[-->`);
        slot($$renderer3, $$props, "default", {});
        $$renderer3.push(`<!--]--></div>`);
      },
      $$slots: { default: true }
    });
    bind_props($$props, { style, x, y });
  });
}
function BaseEdge($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let id2 = fallback($$props["id"], void 0);
    let path = $$props["path"];
    let label = fallback($$props["label"], void 0);
    let labelX = fallback($$props["labelX"], void 0);
    let labelY = fallback($$props["labelY"], void 0);
    let labelStyle = fallback($$props["labelStyle"], void 0);
    let markerStart = fallback($$props["markerStart"], void 0);
    let markerEnd = fallback($$props["markerEnd"], void 0);
    let style = fallback($$props["style"], void 0);
    let interactionWidth = fallback($$props["interactionWidth"], 20);
    let className = fallback($$props["class"], void 0);
    let interactionWidthValue = interactionWidth === void 0 ? 20 : interactionWidth;
    $$renderer2.push(`<path${attr("id", id2)}${attr("d", path)}${attr_class(clsx(cc(["svelte-flow__edge-path", className])))}${attr("marker-start", markerStart)}${attr("marker-end", markerEnd)} fill="none"${attr_style(style)}></path>`);
    if (interactionWidthValue) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<path${attr("d", path)}${attr("stroke-opacity", 0)}${attr("stroke-width", interactionWidthValue)} fill="none" class="svelte-flow__edge-interaction"></path>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if (label) {
      $$renderer2.push("<!--[-->");
      EdgeLabel($$renderer2, {
        x: labelX,
        y: labelY,
        style: labelStyle,
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->${escape_html(label)}`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, {
      id: id2,
      path,
      label,
      labelX,
      labelY,
      labelStyle,
      markerStart,
      markerEnd,
      style,
      interactionWidth,
      class: className
    });
  });
}
function BezierEdgeInternal($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  rest_props($$sanitized_props, [
    "label",
    "labelStyle",
    "style",
    "markerStart",
    "markerEnd",
    "interactionWidth",
    "sourceX",
    "sourceY",
    "sourcePosition",
    "targetX",
    "targetY",
    "targetPosition"
  ]);
  $$renderer.component(($$renderer2) => {
    let path, labelX, labelY;
    let label = fallback($$props["label"], void 0);
    let labelStyle = fallback($$props["labelStyle"], void 0);
    let style = fallback($$props["style"], void 0);
    let markerStart = fallback($$props["markerStart"], void 0);
    let markerEnd = fallback($$props["markerEnd"], void 0);
    let interactionWidth = fallback($$props["interactionWidth"], void 0);
    let sourceX = $$props["sourceX"];
    let sourceY = $$props["sourceY"];
    let sourcePosition = $$props["sourcePosition"];
    let targetX = $$props["targetX"];
    let targetY = $$props["targetY"];
    let targetPosition = $$props["targetPosition"];
    [path, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition
    });
    BaseEdge($$renderer2, {
      path,
      labelX,
      labelY,
      label,
      labelStyle,
      markerStart,
      markerEnd,
      interactionWidth,
      style
    });
    bind_props($$props, {
      label,
      labelStyle,
      style,
      markerStart,
      markerEnd,
      interactionWidth,
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition
    });
  });
}
function SmoothStepEdgeInternal($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  rest_props($$sanitized_props, [
    "label",
    "labelStyle",
    "style",
    "markerStart",
    "markerEnd",
    "interactionWidth",
    "sourceX",
    "sourceY",
    "sourcePosition",
    "targetX",
    "targetY",
    "targetPosition"
  ]);
  $$renderer.component(($$renderer2) => {
    let path, labelX, labelY;
    let label = fallback($$props["label"], void 0);
    let labelStyle = fallback($$props["labelStyle"], void 0);
    let style = fallback($$props["style"], void 0);
    let markerStart = fallback($$props["markerStart"], void 0);
    let markerEnd = fallback($$props["markerEnd"], void 0);
    let interactionWidth = fallback($$props["interactionWidth"], void 0);
    let sourceX = $$props["sourceX"];
    let sourceY = $$props["sourceY"];
    let sourcePosition = $$props["sourcePosition"];
    let targetX = $$props["targetX"];
    let targetY = $$props["targetY"];
    let targetPosition = $$props["targetPosition"];
    [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition
    });
    BaseEdge($$renderer2, {
      path,
      labelX,
      labelY,
      label,
      labelStyle,
      markerStart,
      markerEnd,
      interactionWidth,
      style
    });
    bind_props($$props, {
      label,
      labelStyle,
      style,
      markerStart,
      markerEnd,
      interactionWidth,
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition
    });
  });
}
function StraightEdgeInternal($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  rest_props($$sanitized_props, [
    "label",
    "labelStyle",
    "style",
    "markerStart",
    "markerEnd",
    "interactionWidth",
    "sourceX",
    "sourceY",
    "targetX",
    "targetY"
  ]);
  $$renderer.component(($$renderer2) => {
    let path, labelX, labelY;
    let label = fallback($$props["label"], void 0);
    let labelStyle = fallback($$props["labelStyle"], void 0);
    let style = fallback($$props["style"], void 0);
    let markerStart = fallback($$props["markerStart"], void 0);
    let markerEnd = fallback($$props["markerEnd"], void 0);
    let interactionWidth = fallback($$props["interactionWidth"], void 0);
    let sourceX = $$props["sourceX"];
    let sourceY = $$props["sourceY"];
    let targetX = $$props["targetX"];
    let targetY = $$props["targetY"];
    [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    BaseEdge($$renderer2, {
      path,
      labelX,
      labelY,
      label,
      labelStyle,
      markerStart,
      markerEnd,
      interactionWidth,
      style
    });
    bind_props($$props, {
      label,
      labelStyle,
      style,
      markerStart,
      markerEnd,
      interactionWidth,
      sourceX,
      sourceY,
      targetX,
      targetY
    });
  });
}
function StepEdgeInternal($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  rest_props($$sanitized_props, [
    "label",
    "labelStyle",
    "style",
    "markerStart",
    "markerEnd",
    "interactionWidth",
    "sourceX",
    "sourceY",
    "sourcePosition",
    "targetX",
    "targetY",
    "targetPosition"
  ]);
  $$renderer.component(($$renderer2) => {
    let path, labelX, labelY;
    let label = fallback($$props["label"], void 0);
    let labelStyle = fallback($$props["labelStyle"], void 0);
    let style = fallback($$props["style"], void 0);
    let markerStart = fallback($$props["markerStart"], void 0);
    let markerEnd = fallback($$props["markerEnd"], void 0);
    let interactionWidth = fallback($$props["interactionWidth"], void 0);
    let sourceX = $$props["sourceX"];
    let sourceY = $$props["sourceY"];
    let sourcePosition = $$props["sourcePosition"];
    let targetX = $$props["targetX"];
    let targetY = $$props["targetY"];
    let targetPosition = $$props["targetPosition"];
    [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 0
    });
    BaseEdge($$renderer2, {
      path,
      labelX,
      labelY,
      label,
      labelStyle,
      markerStart,
      markerEnd,
      interactionWidth,
      style
    });
    bind_props($$props, {
      label,
      labelStyle,
      style,
      markerStart,
      markerEnd,
      interactionWidth,
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition
    });
  });
}
function syncNodeStores(nodesStore, userNodesStore) {
  const nodesStoreSetter = nodesStore.set;
  const userNodesStoreSetter = userNodesStore.set;
  const currentNodesStore = get$2(nodesStore);
  const currentUserNodesStore = get$2(userNodesStore);
  const initWithUserNodes = currentNodesStore.length === 0 && currentUserNodesStore.length > 0;
  let val = initWithUserNodes ? currentUserNodesStore : currentNodesStore;
  nodesStore.set(val);
  const _set = (nds) => {
    const updatedNodes = nodesStoreSetter(nds);
    val = updatedNodes;
    userNodesStoreSetter(val);
    return updatedNodes;
  };
  nodesStore.set = userNodesStore.set = _set;
  nodesStore.update = userNodesStore.update = (fn) => _set(fn(val));
}
function syncEdgeStores(edgesStore, userEdgesStore) {
  const nodesStoreSetter = edgesStore.set;
  const userEdgesStoreSetter = userEdgesStore.set;
  let val = get$2(userEdgesStore);
  edgesStore.set(val);
  const _set = (eds) => {
    nodesStoreSetter(eds);
    userEdgesStoreSetter(eds);
    val = eds;
  };
  edgesStore.set = userEdgesStore.set = _set;
  edgesStore.update = userEdgesStore.update = (fn) => _set(fn(val));
}
const syncViewportStores = (panZoomStore, viewportStore, userViewportStore) => {
  if (!userViewportStore) {
    return;
  }
  const panZoom = get$2(panZoomStore);
  const viewportStoreSetter = viewportStore.set;
  const userViewportStoreSetter = userViewportStore.set;
  let val = userViewportStore ? get$2(userViewportStore) : { x: 0, y: 0, zoom: 1 };
  viewportStore.set(val);
  viewportStore.set = (vp) => {
    viewportStoreSetter(vp);
    userViewportStoreSetter(vp);
    val = vp;
    return vp;
  };
  userViewportStore.set = (vp) => {
    panZoom?.syncViewport(vp);
    viewportStoreSetter(vp);
    userViewportStoreSetter(vp);
    val = vp;
    return vp;
  };
  viewportStore.update = (fn) => {
    viewportStore.set(fn(val));
  };
  userViewportStore.update = (fn) => {
    userViewportStore.set(fn(val));
  };
};
const createNodesStore = (nodes, nodeLookup, parentLookup, nodeOrigin = [0, 0], nodeExtent = infiniteExtent, fitViewQueued, fitViewOptions, fitViewResolver, panZoom, width, height, minZoom, maxZoom) => {
  const { subscribe, set: set2, update } = writable([]);
  let value = nodes;
  let defaults = {};
  let elevateNodesOnSelect = true;
  const _set = (nds) => {
    const nodesInitialized = adoptUserNodes(nds, nodeLookup, parentLookup, {
      elevateNodesOnSelect,
      nodeOrigin,
      nodeExtent,
      defaults,
      checkEquality: false
    });
    if (get$2(fitViewQueued) && nodesInitialized && get$2(panZoom)) {
      const fitViewPromise = fitViewport({
        nodes: nodeLookup,
        width: get$2(width),
        height: get$2(height),
        panZoom: get$2(panZoom),
        minZoom: get$2(minZoom),
        maxZoom: get$2(maxZoom)
      }, get$2(fitViewOptions));
      fitViewPromise.then((value2) => {
        get$2(fitViewResolver)?.resolve(value2);
        fitViewResolver.set(null);
      });
      fitViewQueued.set(false);
      fitViewOptions.set(void 0);
    }
    value = nds;
    set2(value);
    return value;
  };
  const _update = (fn) => _set(fn(value));
  const setDefaultOptions = (options) => {
    defaults = options;
  };
  const setOptions = (options) => {
    elevateNodesOnSelect = options.elevateNodesOnSelect ?? elevateNodesOnSelect;
  };
  _set(value);
  return {
    subscribe,
    set: _set,
    update: _update,
    setDefaultOptions,
    setOptions
  };
};
const createEdgesStore = (edges, connectionLookup, edgeLookup, defaultOptions2) => {
  const { subscribe, set: set2, update } = writable([]);
  let value = edges;
  let defaults = {};
  const _set = (eds) => {
    const nextEdges = defaults ? eds.map((edge) => ({ ...defaults, ...edge })) : eds;
    updateConnectionLookup(connectionLookup, edgeLookup, nextEdges);
    value = nextEdges;
    set2(value);
  };
  const _update = (fn) => _set(fn(value));
  const setDefaultOptions = (options) => {
    defaults = options;
  };
  _set(value);
  return {
    subscribe,
    set: _set,
    update: _update,
    setDefaultOptions
  };
};
const initialNodeTypes = {
  input: InputNode,
  output: OutputNode,
  default: DefaultNode,
  group: GroupNode
};
const initialEdgeTypes = {
  straight: StraightEdgeInternal,
  smoothstep: SmoothStepEdgeInternal,
  default: BezierEdgeInternal,
  step: StepEdgeInternal
};
const getInitialStore = ({ nodes = [], edges = [], width, height, fitView, nodeOrigin, nodeExtent }) => {
  const nodeLookup = /* @__PURE__ */ new Map();
  const parentLookup = /* @__PURE__ */ new Map();
  const connectionLookup = /* @__PURE__ */ new Map();
  const edgeLookup = /* @__PURE__ */ new Map();
  const storeNodeOrigin = nodeOrigin ?? [0, 0];
  const storeNodeExtent = nodeExtent ?? infiniteExtent;
  adoptUserNodes(nodes, nodeLookup, parentLookup, {
    nodeExtent: storeNodeExtent,
    nodeOrigin: storeNodeOrigin,
    elevateNodesOnSelect: false,
    checkEquality: false
  });
  updateConnectionLookup(connectionLookup, edgeLookup, edges);
  let viewport = { x: 0, y: 0, zoom: 1 };
  if (fitView && width && height) {
    const bounds = getInternalNodesBounds(nodeLookup, {
      filter: (node) => !!((node.width || node.initialWidth) && (node.height || node.initialHeight))
    });
    viewport = getViewportForBounds(bounds, width, height, 0.5, 2, 0.1);
  }
  const fitViewQueued = writable(false);
  const fitViewOptions = writable(void 0);
  const fitViewResolver = writable(null);
  const panZoom = writable(null);
  const widthStore = writable(500);
  const heightStore = writable(500);
  const minZoom = writable(0.5);
  const maxZoom = writable(2);
  return {
    flowId: writable(null),
    nodes: createNodesStore(nodes, nodeLookup, parentLookup, storeNodeOrigin, storeNodeExtent, fitViewQueued, fitViewOptions, fitViewResolver, panZoom, widthStore, heightStore, minZoom, maxZoom),
    nodeLookup: readable(nodeLookup),
    parentLookup: readable(parentLookup),
    edgeLookup: readable(edgeLookup),
    visibleNodes: readable([]),
    edges: createEdgesStore(edges, connectionLookup, edgeLookup),
    visibleEdges: readable([]),
    connectionLookup: readable(connectionLookup),
    width: widthStore,
    height: heightStore,
    minZoom,
    maxZoom,
    nodeOrigin: writable(storeNodeOrigin),
    nodeDragThreshold: writable(1),
    nodeExtent: writable(storeNodeExtent),
    translateExtent: writable(infiniteExtent),
    autoPanOnNodeDrag: writable(true),
    autoPanOnConnect: writable(true),
    fitViewQueued,
    fitViewOptions,
    fitViewResolver,
    panZoom,
    snapGrid: writable(null),
    dragging: writable(false),
    selectionRect: writable(null),
    selectionKeyPressed: writable(false),
    multiselectionKeyPressed: writable(false),
    deleteKeyPressed: writable(false),
    panActivationKeyPressed: writable(false),
    zoomActivationKeyPressed: writable(false),
    selectionRectMode: writable(null),
    selectionMode: writable(SelectionMode.Partial),
    nodeTypes: writable(initialNodeTypes),
    edgeTypes: writable(initialEdgeTypes),
    viewport: writable(viewport),
    connectionMode: writable(ConnectionMode.Strict),
    domNode: writable(null),
    connection: readable(initialConnection),
    connectionLineType: writable(ConnectionLineType.Bezier),
    connectionRadius: writable(20),
    isValidConnection: writable(() => true),
    nodesDraggable: writable(true),
    nodesConnectable: writable(true),
    elementsSelectable: writable(true),
    selectNodesOnDrag: writable(true),
    markers: readable([]),
    defaultMarkerColor: writable("#b1b1b7"),
    lib: readable("svelte"),
    onlyRenderVisibleElements: writable(false),
    onerror: writable(devWarn),
    ondelete: writable(void 0),
    onedgecreate: writable(void 0),
    onconnect: writable(void 0),
    onconnectstart: writable(void 0),
    onconnectend: writable(void 0),
    onbeforedelete: writable(void 0),
    nodesInitialized: writable(false),
    edgesInitialized: writable(false),
    viewportInitialized: writable(false),
    initialized: readable(false)
  };
};
function getVisibleEdges(store) {
  const visibleEdges = derived([
    store.edges,
    store.nodes,
    store.nodeLookup,
    store.onlyRenderVisibleElements,
    store.viewport,
    store.width,
    store.height
  ], ([edges, , nodeLookup, onlyRenderVisibleElements, viewport, width, height]) => {
    const visibleEdges2 = onlyRenderVisibleElements && width && height ? edges.filter((edge) => {
      const sourceNode = nodeLookup.get(edge.source);
      const targetNode = nodeLookup.get(edge.target);
      return sourceNode && targetNode && isEdgeVisible({
        sourceNode,
        targetNode,
        width,
        height,
        transform: [viewport.x, viewport.y, viewport.zoom]
      });
    }) : edges;
    return visibleEdges2;
  });
  return derived([visibleEdges, store.nodes, store.nodeLookup, store.connectionMode, store.onerror], ([visibleEdges2, , nodeLookup, connectionMode, onerror]) => {
    const layoutedEdges = visibleEdges2.reduce((res, edge) => {
      const sourceNode = nodeLookup.get(edge.source);
      const targetNode = nodeLookup.get(edge.target);
      if (!sourceNode || !targetNode) {
        return res;
      }
      const edgePosition = getEdgePosition({
        id: edge.id,
        sourceNode,
        targetNode,
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null,
        connectionMode,
        onError: onerror
      });
      if (edgePosition) {
        res.push({
          ...edge,
          zIndex: getElevatedEdgeZIndex({
            selected: edge.selected,
            zIndex: edge.zIndex,
            sourceNode,
            targetNode,
            elevateOnSelect: false
          }),
          ...edgePosition
        });
      }
      return res;
    }, []);
    return layoutedEdges;
  });
}
function getVisibleNodes(store) {
  return derived([
    store.nodeLookup,
    store.onlyRenderVisibleElements,
    store.width,
    store.height,
    store.viewport,
    store.nodes
  ], ([nodeLookup, onlyRenderVisibleElements, width, height, viewport]) => {
    const transform = [viewport.x, viewport.y, viewport.zoom];
    return onlyRenderVisibleElements ? getNodesInside(nodeLookup, { x: 0, y: 0, width, height }, transform, true) : Array.from(nodeLookup.values());
  });
}
const key = Symbol();
function createStore({ nodes, edges, width, height, fitView: fitViewOnCreate, nodeOrigin, nodeExtent }) {
  const store = getInitialStore({
    nodes,
    edges,
    width,
    height,
    fitView: fitViewOnCreate,
    nodeOrigin,
    nodeExtent
  });
  function setNodeTypes(nodeTypes) {
    store.nodeTypes.set({
      ...initialNodeTypes,
      ...nodeTypes
    });
  }
  function setEdgeTypes(edgeTypes) {
    store.edgeTypes.set({
      ...initialEdgeTypes,
      ...edgeTypes
    });
  }
  function addEdge$1(edgeParams) {
    const edges2 = get$2(store.edges);
    store.edges.set(addEdge(edgeParams, edges2));
  }
  const updateNodePositions = (nodeDragItems, dragging = false) => {
    const nodeLookup = get$2(store.nodeLookup);
    for (const [id2, dragItem] of nodeDragItems) {
      const node = nodeLookup.get(id2)?.internals.userNode;
      if (!node) {
        continue;
      }
      node.position = dragItem.position;
      node.dragging = dragging;
    }
    store.nodes.update((nds) => nds);
  };
  function updateNodeInternals$1(updates) {
    const nodeLookup = get$2(store.nodeLookup);
    const parentLookup = get$2(store.parentLookup);
    const { changes, updatedInternals } = updateNodeInternals(updates, nodeLookup, get$2(store.parentLookup), get$2(store.domNode), get$2(store.nodeOrigin));
    if (!updatedInternals) {
      return;
    }
    updateAbsolutePositions(nodeLookup, parentLookup, { nodeOrigin, nodeExtent });
    for (const change of changes) {
      const node = nodeLookup.get(change.id)?.internals.userNode;
      if (!node) {
        continue;
      }
      switch (change.type) {
        case "dimensions": {
          const measured = { ...node.measured, ...change.dimensions };
          if (change.setAttributes) {
            node.width = change.dimensions?.width ?? node.width;
            node.height = change.dimensions?.height ?? node.height;
          }
          node.measured = measured;
          break;
        }
        case "position":
          node.position = change.position ?? node.position;
          break;
      }
    }
    store.nodes.update((nds) => nds);
    if (!get$2(store.nodesInitialized)) {
      store.nodesInitialized.set(true);
    }
  }
  function fitView(options) {
    const fitViewResolver = get$2(store.fitViewResolver) ?? withResolvers();
    store.fitViewQueued.set(true);
    store.fitViewOptions.set(options);
    store.fitViewResolver.set(fitViewResolver);
    store.nodes.set(get$2(store.nodes));
    return fitViewResolver.promise;
  }
  function zoomBy(factor, options) {
    const panZoom = get$2(store.panZoom);
    if (!panZoom) {
      return Promise.resolve(false);
    }
    return panZoom.scaleBy(factor, options);
  }
  function zoomIn(options) {
    return zoomBy(1.2, options);
  }
  function zoomOut(options) {
    return zoomBy(1 / 1.2, options);
  }
  function setMinZoom(minZoom) {
    const panZoom = get$2(store.panZoom);
    if (panZoom) {
      panZoom.setScaleExtent([minZoom, get$2(store.maxZoom)]);
      store.minZoom.set(minZoom);
    }
  }
  function setMaxZoom(maxZoom) {
    const panZoom = get$2(store.panZoom);
    if (panZoom) {
      panZoom.setScaleExtent([get$2(store.minZoom), maxZoom]);
      store.maxZoom.set(maxZoom);
    }
  }
  function setTranslateExtent(extent) {
    const panZoom = get$2(store.panZoom);
    if (panZoom) {
      panZoom.setTranslateExtent(extent);
      store.translateExtent.set(extent);
    }
  }
  function resetSelectedElements(elements) {
    let elementsChanged = false;
    elements.forEach((element) => {
      if (element.selected) {
        element.selected = false;
        elementsChanged = true;
      }
    });
    return elementsChanged;
  }
  function setPaneClickDistance(distance2) {
    get$2(store.panZoom)?.setClickDistance(distance2);
  }
  function unselectNodesAndEdges(params) {
    const resetNodes = resetSelectedElements(params?.nodes || get$2(store.nodes));
    if (resetNodes)
      store.nodes.set(get$2(store.nodes));
    const resetEdges = resetSelectedElements(params?.edges || get$2(store.edges));
    if (resetEdges)
      store.edges.set(get$2(store.edges));
  }
  store.deleteKeyPressed.subscribe(async (deleteKeyPressed) => {
    if (deleteKeyPressed) {
      const nodes2 = get$2(store.nodes);
      const edges2 = get$2(store.edges);
      const selectedNodes = nodes2.filter((node) => node.selected);
      const selectedEdges = edges2.filter((edge) => edge.selected);
      const { nodes: matchingNodes, edges: matchingEdges } = await getElementsToRemove({
        nodesToRemove: selectedNodes,
        edgesToRemove: selectedEdges,
        nodes: nodes2,
        edges: edges2,
        onBeforeDelete: get$2(store.onbeforedelete)
      });
      if (matchingNodes.length || matchingEdges.length) {
        store.nodes.update((nds) => nds.filter((node) => !matchingNodes.some((mN) => mN.id === node.id)));
        store.edges.update((eds) => eds.filter((edge) => !matchingEdges.some((mE) => mE.id === edge.id)));
        get$2(store.ondelete)?.({
          nodes: matchingNodes,
          edges: matchingEdges
        });
      }
    }
  });
  function addSelectedNodes(ids) {
    const isMultiSelection = get$2(store.multiselectionKeyPressed);
    store.nodes.update((ns) => ns.map((node) => {
      const nodeWillBeSelected = ids.includes(node.id);
      const selected = isMultiSelection ? node.selected || nodeWillBeSelected : nodeWillBeSelected;
      node.selected = selected;
      return node;
    }));
    if (!isMultiSelection) {
      store.edges.update((es) => es.map((edge) => {
        edge.selected = false;
        return edge;
      }));
    }
  }
  function addSelectedEdges(ids) {
    const isMultiSelection = get$2(store.multiselectionKeyPressed);
    store.edges.update((edges2) => edges2.map((edge) => {
      const edgeWillBeSelected = ids.includes(edge.id);
      const selected = isMultiSelection ? edge.selected || edgeWillBeSelected : edgeWillBeSelected;
      edge.selected = selected;
      return edge;
    }));
    if (!isMultiSelection) {
      store.nodes.update((ns) => ns.map((node) => {
        node.selected = false;
        return node;
      }));
    }
  }
  function handleNodeSelection(id2) {
    const node = get$2(store.nodes)?.find((n) => n.id === id2);
    if (!node) {
      console.warn("012", errorMessages["error012"](id2));
      return;
    }
    store.selectionRect.set(null);
    store.selectionRectMode.set(null);
    if (!node.selected) {
      addSelectedNodes([id2]);
    } else if (node.selected && get$2(store.multiselectionKeyPressed)) {
      unselectNodesAndEdges({ nodes: [node], edges: [] });
    }
  }
  function panBy$1(delta) {
    const viewport = get$2(store.viewport);
    return panBy({
      delta,
      panZoom: get$2(store.panZoom),
      transform: [viewport.x, viewport.y, viewport.zoom],
      translateExtent: get$2(store.translateExtent),
      width: get$2(store.width),
      height: get$2(store.height)
    });
  }
  const _connection = writable(initialConnection);
  const updateConnection = (newConnection) => {
    _connection.set({ ...newConnection });
  };
  function cancelConnection() {
    _connection.set(initialConnection);
  }
  function reset() {
    store.selectionRect.set(null);
    store.selectionRectMode.set(null);
    store.snapGrid.set(null);
    store.isValidConnection.set(() => true);
    unselectNodesAndEdges();
    cancelConnection();
  }
  return {
    // state
    ...store,
    // derived state
    visibleEdges: getVisibleEdges(store),
    visibleNodes: getVisibleNodes(store),
    connection: derived([_connection, store.viewport], ([connection, viewport]) => {
      return connection.inProgress ? {
        ...connection,
        to: pointToRendererPoint(connection.to, [viewport.x, viewport.y, viewport.zoom])
      } : { ...connection };
    }),
    markers: derived([store.edges, store.defaultMarkerColor, store.flowId], ([edges2, defaultColor, id2]) => createMarkerIds(edges2, { defaultColor, id: id2 })),
    initialized: (() => {
      let initialized = false;
      const initialNodesLength = get$2(store.nodes).length;
      const initialEdgesLength = get$2(store.edges).length;
      return derived([store.nodesInitialized, store.edgesInitialized, store.viewportInitialized], ([nodesInitialized, edgesInitialized, viewportInitialized]) => {
        if (initialized)
          return initialized;
        if (initialNodesLength === 0) {
          initialized = viewportInitialized;
        } else if (initialEdgesLength === 0) {
          initialized = viewportInitialized && nodesInitialized;
        } else {
          initialized = viewportInitialized && nodesInitialized && edgesInitialized;
        }
        return initialized;
      });
    })(),
    // actions
    syncNodeStores: (nodes2) => syncNodeStores(store.nodes, nodes2),
    syncEdgeStores: (edges2) => syncEdgeStores(store.edges, edges2),
    syncViewport: (viewport) => syncViewportStores(store.panZoom, store.viewport, viewport),
    setNodeTypes,
    setEdgeTypes,
    addEdge: addEdge$1,
    updateNodePositions,
    updateNodeInternals: updateNodeInternals$1,
    zoomIn,
    zoomOut,
    fitView: (options) => fitView(options),
    setMinZoom,
    setMaxZoom,
    setTranslateExtent,
    setPaneClickDistance,
    unselectNodesAndEdges,
    addSelectedNodes,
    addSelectedEdges,
    handleNodeSelection,
    panBy: panBy$1,
    updateConnection,
    cancelConnection,
    reset
  };
}
function useStore() {
  const store = getContext(key);
  if (!store) {
    throw new Error("In order to use useStore you need to wrap your component in a <SvelteFlowProvider />");
  }
  return store.getStore();
}
function createStoreContext({ nodes, edges, width, height, fitView, nodeOrigin, nodeExtent }) {
  const store = createStore({ nodes, edges, width, height, fitView, nodeOrigin, nodeExtent });
  setContext(key, {
    getStore: () => store
  });
  return store;
}
function Zoom($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let initialViewport = fallback($$props["initialViewport"], void 0);
    let onMoveStart = fallback($$props["onMoveStart"], void 0);
    let onMove = fallback($$props["onMove"], void 0);
    let onMoveEnd = fallback($$props["onMoveEnd"], void 0);
    let panOnScrollMode = $$props["panOnScrollMode"];
    let preventScrolling = $$props["preventScrolling"];
    let zoomOnScroll = $$props["zoomOnScroll"];
    let zoomOnDoubleClick = $$props["zoomOnDoubleClick"];
    let zoomOnPinch = $$props["zoomOnPinch"];
    let panOnDrag = $$props["panOnDrag"];
    let panOnScroll = $$props["panOnScroll"];
    let paneClickDistance = $$props["paneClickDistance"];
    const {
      viewport,
      panZoom,
      selectionRect,
      minZoom,
      maxZoom,
      dragging,
      translateExtent,
      lib,
      panActivationKeyPressed,
      zoomActivationKeyPressed,
      viewportInitialized
    } = useStore();
    store_get($$store_subs ??= {}, "$panActivationKeyPressed", panActivationKeyPressed) || panOnDrag;
    store_get($$store_subs ??= {}, "$panActivationKeyPressed", panActivationKeyPressed) || panOnScroll;
    $$renderer2.push(`<div class="svelte-flow__zoom svelte-8vnmu8"><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, {
      initialViewport,
      onMoveStart,
      onMove,
      onMoveEnd,
      panOnScrollMode,
      preventScrolling,
      zoomOnScroll,
      zoomOnDoubleClick,
      zoomOnPinch,
      panOnDrag,
      panOnScroll,
      paneClickDistance
    });
  });
}
function Pane($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let _panOnDrag, isSelecting;
    let panOnDrag = fallback($$props["panOnDrag"], void 0);
    let selectionOnDrag = fallback($$props["selectionOnDrag"], void 0);
    const {
      nodes,
      nodeLookup,
      edges,
      viewport,
      dragging,
      elementsSelectable,
      selectionRect,
      selectionRectMode,
      selectionKeyPressed,
      selectionMode,
      panActivationKeyPressed,
      unselectNodesAndEdges,
      connection
    } = useStore();
    _panOnDrag = store_get($$store_subs ??= {}, "$panActivationKeyPressed", panActivationKeyPressed) || panOnDrag;
    isSelecting = store_get($$store_subs ??= {}, "$selectionKeyPressed", selectionKeyPressed) || store_get($$store_subs ??= {}, "$selectionRect", selectionRect) || selectionOnDrag && _panOnDrag !== true;
    store_get($$store_subs ??= {}, "$elementsSelectable", elementsSelectable) && (isSelecting || store_get($$store_subs ??= {}, "$selectionRectMode", selectionRectMode) === "user");
    $$renderer2.push(`<div${attr_class("svelte-flow__pane svelte-3z4tl6", void 0, {
      "draggable": panOnDrag === true || Array.isArray(panOnDrag) && panOnDrag.includes(0),
      "dragging": store_get($$store_subs ??= {}, "$dragging", dragging),
      "selection": isSelecting
    })}><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { panOnDrag, selectionOnDrag });
  });
}
function Viewport($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const { viewport } = useStore();
    $$renderer2.push(`<div class="svelte-flow__viewport xyflow__viewport svelte-xslwae"${attr_style(`transform: translate(${stringify(store_get($$store_subs ??= {}, "$viewport", viewport).x)}px, ${stringify(store_get($$store_subs ??= {}, "$viewport", viewport).y)}px) scale(${stringify(store_get($$store_subs ??= {}, "$viewport", viewport).zoom)})`)}><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function getNodeInlineStyleDimensions({ width, height, initialWidth, initialHeight, measuredWidth, measuredHeight }) {
  if (measuredWidth === void 0 && measuredHeight === void 0) {
    const styleWidth = width ?? initialWidth;
    const styleHeight = height ?? initialHeight;
    return {
      width: styleWidth ? `width:${styleWidth}px;` : "",
      height: styleHeight ? `height:${styleHeight}px;` : ""
    };
  }
  return {
    width: width ? `width:${width}px;` : "",
    height: height ? `height:${height}px;` : ""
  };
}
function NodeWrapper($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let nodeType, nodeTypeValid, nodeComponent, inlineStyleDimensions;
    let node = $$props["node"];
    let id2 = $$props["id"];
    let data = fallback($$props["data"], () => ({}), true);
    let selected = fallback($$props["selected"], false);
    let draggable = fallback($$props["draggable"], void 0);
    let selectable = fallback($$props["selectable"], void 0);
    let connectable = fallback($$props["connectable"], true);
    let deletable = fallback($$props["deletable"], true);
    let hidden = fallback($$props["hidden"], false);
    let dragging = fallback($$props["dragging"], false);
    let resizeObserver = fallback($$props["resizeObserver"], null);
    let style = fallback($$props["style"], void 0);
    let type = fallback($$props["type"], "default");
    let isParent = fallback($$props["isParent"], false);
    let positionX = $$props["positionX"];
    let positionY = $$props["positionY"];
    let sourcePosition = fallback($$props["sourcePosition"], void 0);
    let targetPosition = fallback($$props["targetPosition"], void 0);
    let zIndex = $$props["zIndex"];
    let measuredWidth = fallback($$props["measuredWidth"], void 0);
    let measuredHeight = fallback($$props["measuredHeight"], void 0);
    let initialWidth = fallback($$props["initialWidth"], void 0);
    let initialHeight = fallback($$props["initialHeight"], void 0);
    let width = fallback($$props["width"], void 0);
    let height = fallback($$props["height"], void 0);
    let dragHandle = fallback($$props["dragHandle"], void 0);
    let initialized = fallback($$props["initialized"], false);
    let parentId = fallback($$props["parentId"], void 0);
    let nodeClickDistance = fallback($$props["nodeClickDistance"], void 0);
    let className = fallback($$props["class"], "");
    const store = useStore();
    const {
      nodeTypes,
      nodeDragThreshold,
      selectNodesOnDrag,
      handleNodeSelection,
      updateNodeInternals: updateNodeInternals2,
      elementsSelectable,
      nodesDraggable
    } = store;
    let nodeRef;
    let prevNodeRef = null;
    const connectableStore = writable(connectable);
    let prevType = void 0;
    let prevSourcePosition = void 0;
    let prevTargetPosition = void 0;
    setContext("svelteflow__node_id", id2);
    setContext("svelteflow__node_connectable", connectableStore);
    onDestroy(() => {
      if (prevNodeRef) {
        resizeObserver?.unobserve(prevNodeRef);
      }
    });
    nodeType = type || "default";
    nodeTypeValid = !!store_get($$store_subs ??= {}, "$nodeTypes", nodeTypes)[nodeType];
    nodeComponent = store_get($$store_subs ??= {}, "$nodeTypes", nodeTypes)[nodeType] || DefaultNode;
    {
      if (!nodeTypeValid) {
        console.warn("003", errorMessages["error003"](type));
      }
    }
    inlineStyleDimensions = getNodeInlineStyleDimensions({
      width,
      height,
      initialWidth,
      initialHeight,
      measuredWidth,
      measuredHeight
    });
    {
      connectableStore.set(!!connectable);
    }
    {
      const doUpdate = prevType && nodeType !== prevType || prevSourcePosition && sourcePosition !== prevSourcePosition || prevTargetPosition && targetPosition !== prevTargetPosition;
      if (doUpdate) {
        requestAnimationFrame(() => updateNodeInternals2(/* @__PURE__ */ new Map([[id2, { id: id2, nodeElement: nodeRef, force: true }]])));
      }
      prevType = nodeType;
      prevSourcePosition = sourcePosition;
      prevTargetPosition = targetPosition;
    }
    {
      if (resizeObserver && (nodeRef !== prevNodeRef || !initialized)) {
        prevNodeRef && resizeObserver.unobserve(prevNodeRef);
        prevNodeRef = nodeRef;
      }
    }
    if (
      // this handler gets called by XYDrag on drag start when selectNodesOnDrag=true
      // here we only need to call it when selectNodesOnDrag=false
      !hidden
    ) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div${attr("data-id", id2)}${attr_class(
        clsx(cc([
          "svelte-flow__node",
          `svelte-flow__node-${nodeType}`,
          className
        ])),
        void 0,
        {
          "dragging": dragging,
          "selected": selected,
          "draggable": draggable,
          "connectable": connectable,
          "selectable": selectable,
          "nopan": draggable,
          "parent": isParent
        }
      )}${attr_style(`${stringify(style ?? "")};${stringify(inlineStyleDimensions.width)}${stringify(inlineStyleDimensions.height)}`, {
        "z-index": zIndex,
        transform: `translate(${stringify(positionX)}px, ${stringify(positionY)}px)`,
        visibility: initialized ? "visible" : "hidden"
      })}><!---->`);
      nodeComponent?.($$renderer2, {
        data,
        id: id2,
        selected: selected ?? false,
        selectable: selectable ?? store_get($$store_subs ??= {}, "$elementsSelectable", elementsSelectable) ?? true,
        deletable: deletable ?? true,
        sourcePosition,
        targetPosition,
        zIndex,
        dragging,
        draggable: draggable ?? store_get($$store_subs ??= {}, "$nodesDraggable", nodesDraggable) ?? true,
        dragHandle,
        parentId,
        type: nodeType,
        isConnectable: store_get($$store_subs ??= {}, "$connectableStore", connectableStore),
        positionAbsoluteX: positionX,
        positionAbsoluteY: positionY,
        width,
        height
      });
      $$renderer2.push(`<!----></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, {
      node,
      id: id2,
      data,
      selected,
      draggable,
      selectable,
      connectable,
      deletable,
      hidden,
      dragging,
      resizeObserver,
      style,
      type,
      isParent,
      positionX,
      positionY,
      sourcePosition,
      targetPosition,
      zIndex,
      measuredWidth,
      measuredHeight,
      initialWidth,
      initialHeight,
      width,
      height,
      dragHandle,
      initialized,
      parentId,
      nodeClickDistance,
      class: className
    });
  });
}
function NodeRenderer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let nodeClickDistance = fallback($$props["nodeClickDistance"], 0);
    const {
      visibleNodes,
      nodesDraggable,
      nodesConnectable,
      elementsSelectable,
      updateNodeInternals: updateNodeInternals2,
      parentLookup
    } = useStore();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver((entries) => {
      const updates = /* @__PURE__ */ new Map();
      entries.forEach((entry) => {
        const id2 = entry.target.getAttribute("data-id");
        updates.set(id2, { id: id2, nodeElement: entry.target, force: true });
      });
      updateNodeInternals2(updates);
    });
    onDestroy(() => {
      resizeObserver?.disconnect();
    });
    $$renderer2.push(`<div class="svelte-flow__nodes svelte-1fzfwss"><!--[-->`);
    const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$visibleNodes", visibleNodes));
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let node = each_array[$$index];
      NodeWrapper($$renderer2, {
        node,
        id: node.id,
        data: node.data,
        selected: !!node.selected,
        hidden: !!node.hidden,
        draggable: !!(node.draggable || store_get($$store_subs ??= {}, "$nodesDraggable", nodesDraggable) && typeof node.draggable === "undefined"),
        selectable: !!(node.selectable || store_get($$store_subs ??= {}, "$elementsSelectable", elementsSelectable) && typeof node.selectable === "undefined"),
        connectable: !!(node.connectable || store_get($$store_subs ??= {}, "$nodesConnectable", nodesConnectable) && typeof node.connectable === "undefined"),
        deletable: node.deletable ?? true,
        positionX: node.internals.positionAbsolute.x,
        positionY: node.internals.positionAbsolute.y,
        isParent: store_get($$store_subs ??= {}, "$parentLookup", parentLookup).has(node.id),
        style: node.style,
        class: node.class,
        type: node.type ?? "default",
        sourcePosition: node.sourcePosition,
        targetPosition: node.targetPosition,
        dragging: node.dragging,
        zIndex: node.internals.z ?? 0,
        dragHandle: node.dragHandle,
        initialized: nodeHasDimensions(node),
        width: node.width,
        height: node.height,
        initialWidth: node.initialWidth,
        initialHeight: node.initialHeight,
        measuredWidth: node.measured.width,
        measuredHeight: node.measured.height,
        parentId: node.parentId,
        resizeObserver,
        nodeClickDistance
      });
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { nodeClickDistance });
  });
}
function EdgeWrapper($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let edgeType, edgeComponent, markerStartUrl, markerEndUrl, isSelectable;
    let id2 = $$props["id"];
    let type = fallback($$props["type"], "default");
    let source = fallback($$props["source"], "");
    let target = fallback($$props["target"], "");
    let data = fallback($$props["data"], () => ({}), true);
    let style = fallback($$props["style"], void 0);
    let zIndex = fallback($$props["zIndex"], void 0);
    let animated = fallback($$props["animated"], false);
    let selected = fallback($$props["selected"], false);
    let selectable = fallback($$props["selectable"], void 0);
    let deletable = fallback($$props["deletable"], void 0);
    let hidden = fallback($$props["hidden"], false);
    let label = fallback($$props["label"], void 0);
    let labelStyle = fallback($$props["labelStyle"], void 0);
    let markerStart = fallback($$props["markerStart"], void 0);
    let markerEnd = fallback($$props["markerEnd"], void 0);
    let sourceHandle = fallback($$props["sourceHandle"], void 0);
    let targetHandle = fallback($$props["targetHandle"], void 0);
    let sourceX = $$props["sourceX"];
    let sourceY = $$props["sourceY"];
    let targetX = $$props["targetX"];
    let targetY = $$props["targetY"];
    let sourcePosition = $$props["sourcePosition"];
    let targetPosition = $$props["targetPosition"];
    let ariaLabel = fallback($$props["ariaLabel"], void 0);
    let interactionWidth = fallback($$props["interactionWidth"], void 0);
    let className = fallback($$props["class"], "");
    setContext("svelteflow__edge_id", id2);
    const { edgeLookup, edgeTypes, flowId, elementsSelectable } = useStore();
    useHandleEdgeSelect();
    edgeType = type || "default";
    edgeComponent = store_get($$store_subs ??= {}, "$edgeTypes", edgeTypes)[edgeType] || BezierEdgeInternal;
    markerStartUrl = markerStart ? `url('#${getMarkerId(markerStart, store_get($$store_subs ??= {}, "$flowId", flowId))}')` : void 0;
    markerEndUrl = markerEnd ? `url('#${getMarkerId(markerEnd, store_get($$store_subs ??= {}, "$flowId", flowId))}')` : void 0;
    isSelectable = selectable ?? store_get($$store_subs ??= {}, "$elementsSelectable", elementsSelectable);
    if (!hidden) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<svg${attr_style("", { "z-index": zIndex })}><g${attr_class(clsx(cc(["svelte-flow__edge", className])), void 0, {
        "animated": animated,
        "selected": selected,
        "selectable": isSelectable
      })}${attr("data-id", id2)}${attr("aria-label", ariaLabel === null ? void 0 : ariaLabel ? ariaLabel : `Edge from ${source} to ${target}`)} role="img"><!---->`);
      edgeComponent?.($$renderer2, {
        id: id2,
        source,
        target,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        animated,
        selected,
        label,
        labelStyle,
        data,
        style,
        interactionWidth,
        selectable: isSelectable,
        deletable: deletable ?? true,
        type: edgeType,
        sourceHandleId: sourceHandle,
        targetHandleId: targetHandle,
        markerStart: markerStartUrl,
        markerEnd: markerEndUrl
      });
      $$renderer2.push(`<!----></g></svg>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, {
      id: id2,
      type,
      source,
      target,
      data,
      style,
      zIndex,
      animated,
      selected,
      selectable,
      deletable,
      hidden,
      label,
      labelStyle,
      markerStart,
      markerEnd,
      sourceHandle,
      targetHandle,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      ariaLabel,
      interactionWidth,
      class: className
    });
  });
}
function CallOnMount($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let _onMount = fallback($$props["onMount"], void 0);
    let _onDestroy = fallback($$props["onDestroy"], void 0);
    bind_props($$props, { onMount: _onMount, onDestroy: _onDestroy });
  });
}
function MarkerDefinition($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const { markers } = useStore();
    $$renderer2.push(`<defs><!--[-->`);
    const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$markers", markers));
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let marker = each_array[$$index];
      Marker($$renderer2, spread_props([marker]));
    }
    $$renderer2.push(`<!--]--></defs>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function Marker($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let id2 = $$props["id"];
    let type = $$props["type"];
    let width = fallback($$props["width"], 12.5);
    let height = fallback($$props["height"], 12.5);
    let markerUnits = fallback($$props["markerUnits"], "strokeWidth");
    let orient = fallback($$props["orient"], "auto-start-reverse");
    let color2 = fallback($$props["color"], void 0);
    let strokeWidth = fallback($$props["strokeWidth"], void 0);
    $$renderer2.push(`<marker class="svelte-flow__arrowhead"${attr("id", id2)}${attr("markerWidth", `${width}`)}${attr("markerHeight", `${height}`)} viewBox="-10 -10 20 20"${attr("markerUnits", markerUnits)}${attr("orient", orient)} refX="0" refY="0">`);
    if (type === MarkerType.Arrow) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<polyline${attr("stroke", color2)} stroke-linecap="round" stroke-linejoin="round"${attr("stroke-width", strokeWidth)} fill="none" points="-5,-4 0,0 -5,4"></polyline>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (type === MarkerType.ArrowClosed) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<polyline${attr("stroke", color2)} stroke-linecap="round" stroke-linejoin="round"${attr("stroke-width", strokeWidth)}${attr("fill", color2)} points="-5,-4 0,0 -5,4 -5,-4"></polyline>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></marker>`);
    bind_props($$props, {
      id: id2,
      type,
      width,
      height,
      markerUnits,
      orient,
      color: color2,
      strokeWidth
    });
  });
}
function EdgeRenderer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let defaultEdgeOptions = $$props["defaultEdgeOptions"];
    const {
      visibleEdges,
      edgesInitialized,
      edges: { setDefaultOptions },
      elementsSelectable
    } = useStore();
    $$renderer2.push(`<div class="svelte-flow__edges"><svg class="svelte-flow__marker">`);
    MarkerDefinition($$renderer2);
    $$renderer2.push(`<!----></svg> <!--[-->`);
    const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$visibleEdges", visibleEdges));
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let edge = each_array[$$index];
      EdgeWrapper($$renderer2, {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: edge.data,
        style: edge.style,
        animated: edge.animated,
        selected: edge.selected,
        selectable: edge.selectable ?? store_get($$store_subs ??= {}, "$elementsSelectable", elementsSelectable),
        deletable: edge.deletable,
        hidden: edge.hidden,
        label: edge.label,
        labelStyle: edge.labelStyle,
        markerStart: edge.markerStart,
        markerEnd: edge.markerEnd,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        sourceX: edge.sourceX,
        sourceY: edge.sourceY,
        targetX: edge.targetX,
        targetY: edge.targetY,
        sourcePosition: edge.sourcePosition,
        targetPosition: edge.targetPosition,
        ariaLabel: edge.ariaLabel,
        interactionWidth: edge.interactionWidth,
        class: edge.class,
        type: edge.type || "default",
        zIndex: edge.zIndex
      });
    }
    $$renderer2.push(`<!--]--> `);
    if (store_get($$store_subs ??= {}, "$visibleEdges", visibleEdges).length > 0) {
      $$renderer2.push("<!--[-->");
      CallOnMount($$renderer2, {
        onMount: () => {
          store_set(edgesInitialized, true);
        },
        onDestroy: () => {
          store_set(edgesInitialized, false);
        }
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { defaultEdgeOptions });
  });
}
function Selection($$renderer, $$props) {
  let x = fallback($$props["x"], 0);
  let y = fallback($$props["y"], 0);
  let width = fallback($$props["width"], 0);
  let height = fallback($$props["height"], 0);
  let isVisible = fallback($$props["isVisible"], true);
  if (isVisible) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<div class="svelte-flow__selection svelte-tgeejd"${attr_style("", {
      width: typeof width === "string" ? width : `${width}px`,
      height: typeof height === "string" ? height : `${height}px`,
      transform: `translate(${x}px, ${y}px)`
    })}></div>`);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]-->`);
  bind_props($$props, { x, y, width, height, isVisible });
}
function UserSelection($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const { selectionRect, selectionRectMode } = useStore();
    Selection($$renderer2, {
      isVisible: !!(store_get($$store_subs ??= {}, "$selectionRect", selectionRect) && store_get($$store_subs ??= {}, "$selectionRectMode", selectionRectMode) === "user"),
      width: store_get($$store_subs ??= {}, "$selectionRect", selectionRect)?.width,
      height: store_get($$store_subs ??= {}, "$selectionRect", selectionRect)?.height,
      x: store_get($$store_subs ??= {}, "$selectionRect", selectionRect)?.x,
      y: store_get($$store_subs ??= {}, "$selectionRect", selectionRect)?.y
    });
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function NodeSelection($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const store = useStore();
    const { selectionRectMode, nodes, nodeLookup } = store;
    let bounds = null;
    if (store_get($$store_subs ??= {}, "$selectionRectMode", selectionRectMode) === "nodes") {
      bounds = getInternalNodesBounds(store_get($$store_subs ??= {}, "$nodeLookup", nodeLookup), { filter: (node) => !!node.selected });
      store_get($$store_subs ??= {}, "$nodes", nodes);
    }
    if (store_get($$store_subs ??= {}, "$selectionRectMode", selectionRectMode) === "nodes" && bounds && isNumeric(bounds.x) && isNumeric(bounds.y)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="selection-wrapper nopan svelte-mro1il"${attr_style(`width: ${stringify(bounds.width)}px; height: ${stringify(bounds.height)}px; transform: translate(${stringify(bounds.x)}px, ${stringify(bounds.y)}px)`)} role="button" tabindex="-1">`);
      Selection($$renderer2, { width: "100%", height: "100%", x: 0, y: 0 });
      $$renderer2.push(`<!----></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function KeyHandler($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let selectionKey = fallback($$props["selectionKey"], "Shift");
    let multiSelectionKey = fallback($$props["multiSelectionKey"], () => isMacOs() ? "Meta" : "Control", true);
    let deleteKey = fallback($$props["deleteKey"], "Backspace");
    let panActivationKey = fallback($$props["panActivationKey"], " ");
    let zoomActivationKey = fallback($$props["zoomActivationKey"], () => isMacOs() ? "Meta" : "Control", true);
    const {
      selectionKeyPressed,
      multiselectionKeyPressed,
      deleteKeyPressed,
      panActivationKeyPressed,
      zoomActivationKeyPressed,
      selectionRect
    } = useStore();
    bind_props($$props, {
      selectionKey,
      multiSelectionKey,
      deleteKey,
      panActivationKey,
      zoomActivationKey
    });
  });
}
function ConnectionLine($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let containerStyle = fallback($$props["containerStyle"], "");
    let style = fallback($$props["style"], "");
    let isCustomComponent = fallback($$props["isCustomComponent"], false);
    const { width, height, connection, connectionLineType } = useStore();
    let path = null;
    if (store_get($$store_subs ??= {}, "$connection", connection).inProgress && !isCustomComponent) {
      const { from, to, fromPosition, toPosition } = store_get($$store_subs ??= {}, "$connection", connection);
      const pathParams = {
        sourceX: from.x,
        sourceY: from.y,
        sourcePosition: fromPosition,
        targetX: to.x,
        targetY: to.y,
        targetPosition: toPosition
      };
      switch (store_get($$store_subs ??= {}, "$connectionLineType", connectionLineType)) {
        case ConnectionLineType.Bezier:
          [path] = getBezierPath(pathParams);
          break;
        case ConnectionLineType.Step:
          [path] = getSmoothStepPath({ ...pathParams, borderRadius: 0 });
          break;
        case ConnectionLineType.SmoothStep:
          [path] = getSmoothStepPath(pathParams);
          break;
        default:
          [path] = getStraightPath(pathParams);
      }
    }
    if (store_get($$store_subs ??= {}, "$connection", connection).inProgress) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<svg${attr("width", store_get($$store_subs ??= {}, "$width", width))}${attr("height", store_get($$store_subs ??= {}, "$height", height))} class="svelte-flow__connectionline"${attr_style(containerStyle)}><g${attr_class(clsx(cc([
        "svelte-flow__connection",
        getConnectionStatus(store_get($$store_subs ??= {}, "$connection", connection).isValid)
      ])))}><!--[-->`);
      slot($$renderer2, $$props, "connectionLine", {});
      $$renderer2.push(`<!--]-->`);
      if (!isCustomComponent) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<path${attr("d", path)}${attr_style(style)} fill="none" class="svelte-flow__connection-path"></path>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></g></svg>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { containerStyle, style, isCustomComponent });
  });
}
function Panel($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["position", "style", "class"]);
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let positionClasses;
    let position = fallback($$props["position"], "top-right");
    let style = fallback($$props["style"], void 0);
    let className = fallback($$props["class"], void 0);
    const { selectionRectMode } = useStore();
    positionClasses = `${position}`.split("-");
    $$renderer2.push(`<div${attributes(
      {
        class: clsx(cc(["svelte-flow__panel", className, ...positionClasses])),
        style,
        ...$$restProps
      },
      void 0,
      void 0,
      {
        "pointer-events": store_get($$store_subs ??= {}, "$selectionRectMode", selectionRectMode) ? "none" : ""
      }
    )}><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { position, style, class: className });
  });
}
function Attribution($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let proOptions = fallback($$props["proOptions"], void 0);
    let position = fallback($$props["position"], "bottom-right");
    if (!proOptions?.hideAttribution) {
      $$renderer2.push("<!--[-->");
      Panel($$renderer2, {
        position,
        class: "svelte-flow__attribution",
        "data-message": "Feel free to remove the attribution or check out how you could support us: https://svelteflow.dev/support-us",
        children: ($$renderer3) => {
          $$renderer3.push(`<a href="https://svelteflow.dev" target="_blank" rel="noopener noreferrer" aria-label="Svelte Flow attribution">Svelte Flow</a>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { proOptions, position });
  });
}
function updateStore(store, { nodeTypes, edgeTypes, minZoom, maxZoom, translateExtent, paneClickDistance }) {
  if (nodeTypes !== void 0) {
    store.setNodeTypes(nodeTypes);
  }
  if (edgeTypes !== void 0) {
    store.setEdgeTypes(edgeTypes);
  }
  if (minZoom !== void 0) {
    store.setMinZoom(minZoom);
  }
  if (maxZoom !== void 0) {
    store.setMaxZoom(maxZoom);
  }
  if (translateExtent !== void 0) {
    store.setTranslateExtent(translateExtent);
  }
  if (paneClickDistance !== void 0) {
    store.setPaneClickDistance(paneClickDistance);
  }
}
const getKeys = (obj) => Object.keys(obj);
function updateStoreByKeys(store, keys) {
  getKeys(keys).forEach((prop) => {
    const update = keys[prop];
    if (update !== void 0) {
      store[prop].set(update);
    }
  });
}
function getMediaQuery() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return null;
  }
  return window.matchMedia("(prefers-color-scheme: dark)");
}
function useColorModeClass(colorMode = "light") {
  const colorModeClass = readable("light", (set2) => {
    if (colorMode !== "system") {
      set2(colorMode);
      return;
    }
    const mediaQuery = getMediaQuery();
    const updateColorModeClass = () => set2(mediaQuery?.matches ? "dark" : "light");
    set2(mediaQuery?.matches ? "dark" : "light");
    mediaQuery?.addEventListener("change", updateColorModeClass);
    return () => {
      mediaQuery?.removeEventListener("change", updateColorModeClass);
    };
  });
  return colorModeClass;
}
function SvelteFlow($$renderer, $$props) {
  const $$slots = sanitize_slots($$props);
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "id",
    "nodes",
    "edges",
    "fitView",
    "fitViewOptions",
    "minZoom",
    "maxZoom",
    "initialViewport",
    "viewport",
    "nodeTypes",
    "edgeTypes",
    "selectionKey",
    "selectionMode",
    "panActivationKey",
    "multiSelectionKey",
    "zoomActivationKey",
    "nodesDraggable",
    "nodesConnectable",
    "nodeDragThreshold",
    "elementsSelectable",
    "snapGrid",
    "deleteKey",
    "connectionRadius",
    "connectionLineType",
    "connectionMode",
    "connectionLineStyle",
    "connectionLineContainerStyle",
    "onMoveStart",
    "onMove",
    "onMoveEnd",
    "isValidConnection",
    "translateExtent",
    "nodeExtent",
    "onlyRenderVisibleElements",
    "panOnScrollMode",
    "preventScrolling",
    "zoomOnScroll",
    "zoomOnDoubleClick",
    "zoomOnPinch",
    "panOnScroll",
    "panOnDrag",
    "selectionOnDrag",
    "autoPanOnConnect",
    "autoPanOnNodeDrag",
    "onerror",
    "ondelete",
    "onedgecreate",
    "attributionPosition",
    "proOptions",
    "defaultEdgeOptions",
    "width",
    "height",
    "colorMode",
    "onconnect",
    "onconnectstart",
    "onconnectend",
    "onbeforedelete",
    "oninit",
    "nodeOrigin",
    "paneClickDistance",
    "nodeClickDistance",
    "defaultMarkerColor",
    "style",
    "class"
  ]);
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let colorModeClass;
    let id2 = fallback($$props["id"], "1");
    let nodes = $$props["nodes"];
    let edges = $$props["edges"];
    let fitView = fallback($$props["fitView"], void 0);
    let fitViewOptions = fallback($$props["fitViewOptions"], void 0);
    let minZoom = fallback($$props["minZoom"], void 0);
    let maxZoom = fallback($$props["maxZoom"], void 0);
    let initialViewport = fallback($$props["initialViewport"], void 0);
    let viewport = fallback($$props["viewport"], void 0);
    let nodeTypes = fallback($$props["nodeTypes"], void 0);
    let edgeTypes = fallback($$props["edgeTypes"], void 0);
    let selectionKey = fallback($$props["selectionKey"], void 0);
    let selectionMode = fallback($$props["selectionMode"], void 0);
    let panActivationKey = fallback($$props["panActivationKey"], void 0);
    let multiSelectionKey = fallback($$props["multiSelectionKey"], void 0);
    let zoomActivationKey = fallback($$props["zoomActivationKey"], void 0);
    let nodesDraggable = fallback($$props["nodesDraggable"], void 0);
    let nodesConnectable = fallback($$props["nodesConnectable"], void 0);
    let nodeDragThreshold = fallback($$props["nodeDragThreshold"], void 0);
    let elementsSelectable = fallback($$props["elementsSelectable"], void 0);
    let snapGrid = fallback($$props["snapGrid"], void 0);
    let deleteKey = fallback($$props["deleteKey"], void 0);
    let connectionRadius = fallback($$props["connectionRadius"], void 0);
    let connectionLineType = fallback($$props["connectionLineType"], void 0);
    let connectionMode = fallback($$props["connectionMode"], () => ConnectionMode.Strict, true);
    let connectionLineStyle = fallback($$props["connectionLineStyle"], "");
    let connectionLineContainerStyle = fallback($$props["connectionLineContainerStyle"], "");
    let onMoveStart = fallback($$props["onMoveStart"], void 0);
    let onMove = fallback($$props["onMove"], void 0);
    let onMoveEnd = fallback($$props["onMoveEnd"], void 0);
    let isValidConnection = fallback($$props["isValidConnection"], void 0);
    let translateExtent = fallback($$props["translateExtent"], void 0);
    let nodeExtent = fallback($$props["nodeExtent"], void 0);
    let onlyRenderVisibleElements = fallback($$props["onlyRenderVisibleElements"], void 0);
    let panOnScrollMode = fallback($$props["panOnScrollMode"], () => PanOnScrollMode.Free, true);
    let preventScrolling = fallback($$props["preventScrolling"], true);
    let zoomOnScroll = fallback($$props["zoomOnScroll"], true);
    let zoomOnDoubleClick = fallback($$props["zoomOnDoubleClick"], true);
    let zoomOnPinch = fallback($$props["zoomOnPinch"], true);
    let panOnScroll = fallback($$props["panOnScroll"], false);
    let panOnDrag = fallback($$props["panOnDrag"], true);
    let selectionOnDrag = fallback($$props["selectionOnDrag"], void 0);
    let autoPanOnConnect = fallback($$props["autoPanOnConnect"], true);
    let autoPanOnNodeDrag = fallback($$props["autoPanOnNodeDrag"], true);
    let onerror = fallback($$props["onerror"], void 0);
    let ondelete = fallback($$props["ondelete"], void 0);
    let onedgecreate = fallback($$props["onedgecreate"], void 0);
    let attributionPosition = fallback($$props["attributionPosition"], void 0);
    let proOptions = fallback($$props["proOptions"], void 0);
    let defaultEdgeOptions = fallback($$props["defaultEdgeOptions"], void 0);
    let width = fallback($$props["width"], void 0);
    let height = fallback($$props["height"], void 0);
    let colorMode = fallback($$props["colorMode"], "light");
    let onconnect = fallback($$props["onconnect"], void 0);
    let onconnectstart = fallback($$props["onconnectstart"], void 0);
    let onconnectend = fallback($$props["onconnectend"], void 0);
    let onbeforedelete = fallback($$props["onbeforedelete"], void 0);
    let oninit = fallback($$props["oninit"], void 0);
    let nodeOrigin = fallback($$props["nodeOrigin"], void 0);
    let paneClickDistance = fallback($$props["paneClickDistance"], 0);
    let nodeClickDistance = fallback($$props["nodeClickDistance"], 0);
    let defaultMarkerColor = fallback($$props["defaultMarkerColor"], "#b1b1b7");
    let style = fallback($$props["style"], void 0);
    let className = fallback($$props["class"], void 0);
    const initViewport = store_get($$store_subs ??= {}, "$viewport", viewport) || initialViewport;
    const store = hasContext(key) ? useStore() : createStoreContext({
      nodes: get$2(nodes),
      edges: get$2(edges),
      width,
      height,
      fitView,
      nodeOrigin,
      nodeExtent
    });
    const { initialized } = store;
    let onInitCalled = false;
    {
      if (!onInitCalled && store_get($$store_subs ??= {}, "$initialized", initialized)) {
        oninit?.();
        onInitCalled = true;
      }
    }
    {
      const updatableProps = {
        flowId: id2,
        connectionLineType,
        connectionRadius,
        selectionMode,
        snapGrid,
        defaultMarkerColor,
        nodesDraggable,
        nodesConnectable,
        elementsSelectable,
        onlyRenderVisibleElements,
        isValidConnection,
        autoPanOnConnect,
        autoPanOnNodeDrag,
        onerror,
        ondelete,
        onedgecreate,
        connectionMode,
        nodeDragThreshold,
        onconnect,
        onconnectstart,
        onconnectend,
        onbeforedelete,
        nodeOrigin
      };
      updateStoreByKeys(store, updatableProps);
    }
    updateStore(store, {
      nodeTypes,
      edgeTypes,
      minZoom,
      maxZoom,
      translateExtent,
      paneClickDistance
    });
    colorModeClass = useColorModeClass(colorMode);
    $$renderer2.push(`<div${attributes(
      {
        style,
        class: clsx(cc([
          "svelte-flow",
          className,
          store_get($$store_subs ??= {}, "$colorModeClass", colorModeClass)
        ])),
        "data-testid": "svelte-flow__wrapper",
        ...$$restProps,
        role: "application"
      },
      "svelte-6v6nc"
    )}>`);
    KeyHandler($$renderer2, {
      selectionKey,
      deleteKey,
      panActivationKey,
      multiSelectionKey,
      zoomActivationKey
    });
    $$renderer2.push(`<!----> `);
    Zoom($$renderer2, {
      initialViewport: initViewport,
      onMoveStart,
      onMove,
      onMoveEnd,
      panOnScrollMode: panOnScrollMode === void 0 ? PanOnScrollMode.Free : panOnScrollMode,
      preventScrolling: preventScrolling === void 0 ? true : preventScrolling,
      zoomOnScroll: zoomOnScroll === void 0 ? true : zoomOnScroll,
      zoomOnDoubleClick: zoomOnDoubleClick === void 0 ? true : zoomOnDoubleClick,
      zoomOnPinch: zoomOnPinch === void 0 ? true : zoomOnPinch,
      panOnScroll: panOnScroll === void 0 ? false : panOnScroll,
      panOnDrag: panOnDrag === void 0 ? true : panOnDrag,
      paneClickDistance: paneClickDistance === void 0 ? 0 : paneClickDistance,
      children: ($$renderer3) => {
        Pane($$renderer3, {
          panOnDrag: panOnDrag === void 0 ? true : panOnDrag,
          selectionOnDrag,
          children: ($$renderer4) => {
            Viewport($$renderer4, {
              children: ($$renderer5) => {
                EdgeRenderer($$renderer5, { defaultEdgeOptions });
                $$renderer5.push(`<!----> `);
                ConnectionLine($$renderer5, {
                  containerStyle: connectionLineContainerStyle,
                  style: connectionLineStyle,
                  isCustomComponent: $$slots.connectionLine,
                  $$slots: {
                    connectionLine: ($$renderer6) => {
                      $$renderer6.push(`<!--[-->`);
                      slot($$renderer6, $$props, "connectionLine", {});
                      $$renderer6.push(`<!--]-->`);
                    }
                  }
                });
                $$renderer5.push(`<!----> <div class="svelte-flow__edgelabel-renderer"></div> <div class="svelte-flow__viewport-portal"></div> `);
                NodeRenderer($$renderer5, { nodeClickDistance });
                $$renderer5.push(`<!----> `);
                NodeSelection($$renderer5);
                $$renderer5.push(`<!---->`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            UserSelection($$renderer4);
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Attribution($$renderer2, { proOptions, position: attributionPosition });
    $$renderer2.push(`<!----> <!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, {
      id: id2,
      nodes,
      edges,
      fitView,
      fitViewOptions,
      minZoom,
      maxZoom,
      initialViewport,
      viewport,
      nodeTypes,
      edgeTypes,
      selectionKey,
      selectionMode,
      panActivationKey,
      multiSelectionKey,
      zoomActivationKey,
      nodesDraggable,
      nodesConnectable,
      nodeDragThreshold,
      elementsSelectable,
      snapGrid,
      deleteKey,
      connectionRadius,
      connectionLineType,
      connectionMode,
      connectionLineStyle,
      connectionLineContainerStyle,
      onMoveStart,
      onMove,
      onMoveEnd,
      isValidConnection,
      translateExtent,
      nodeExtent,
      onlyRenderVisibleElements,
      panOnScrollMode,
      preventScrolling,
      zoomOnScroll,
      zoomOnDoubleClick,
      zoomOnPinch,
      panOnScroll,
      panOnDrag,
      selectionOnDrag,
      autoPanOnConnect,
      autoPanOnNodeDrag,
      onerror,
      ondelete,
      onedgecreate,
      attributionPosition,
      proOptions,
      defaultEdgeOptions,
      width,
      height,
      colorMode,
      onconnect,
      onconnectstart,
      onconnectend,
      onbeforedelete,
      oninit,
      nodeOrigin,
      paneClickDistance,
      nodeClickDistance,
      defaultMarkerColor,
      style,
      class: className
    });
  });
}
function ControlButton($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "class",
    "bgColor",
    "bgColorHover",
    "color",
    "colorHover",
    "borderColor"
  ]);
  $$renderer.component(($$renderer2) => {
    let className = fallback($$props["class"], void 0);
    let bgColor = fallback($$props["bgColor"], void 0);
    let bgColorHover = fallback($$props["bgColorHover"], void 0);
    let color2 = fallback($$props["color"], void 0);
    let colorHover = fallback($$props["colorHover"], void 0);
    let borderColor = fallback($$props["borderColor"], void 0);
    $$renderer2.push(`<button${attributes(
      {
        type: "button",
        class: clsx(cc(["svelte-flow__controls-button", className])),
        ...$$restProps
      },
      void 0,
      void 0,
      {
        "--xy-controls-button-background-color-props": bgColor,
        "--xy-controls-button-background-color-hover-props": bgColorHover,
        "--xy-controls-button-color-props": color2,
        "--xy-controls-button-color-hover-props": colorHover,
        "--xy-controls-button-border-color-props": borderColor
      }
    )}><!--[-->`);
    slot($$renderer2, $$props, "default", { class: "button-svg" });
    $$renderer2.push(`<!--]--></button>`);
    bind_props($$props, {
      class: className,
      bgColor,
      bgColorHover,
      color: color2,
      colorHover,
      borderColor
    });
  });
}
function Plus($$renderer) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z"></path></svg>`);
}
function Minus($$renderer) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 5"><path d="M0 0h32v4.2H0z"></path></svg>`);
}
function Fit($$renderer) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 30"><path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z"></path></svg>`);
}
function Lock($$renderer) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 32"><path d="M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z"></path></svg>`);
}
function Unlock($$renderer) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 32"><path d="M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z"></path></svg>`);
}
function Controls($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let isInteractive, minZoomReached, maxZoomReached, orientationClass;
    let position = fallback($$props["position"], "bottom-left");
    let showZoom = fallback($$props["showZoom"], true);
    let showFitView = fallback($$props["showFitView"], true);
    let showLock = fallback($$props["showLock"], true);
    let buttonBgColor = fallback($$props["buttonBgColor"], void 0);
    let buttonBgColorHover = fallback($$props["buttonBgColorHover"], void 0);
    let buttonColor = fallback($$props["buttonColor"], void 0);
    let buttonColorHover = fallback($$props["buttonColorHover"], void 0);
    let buttonBorderColor = fallback($$props["buttonBorderColor"], void 0);
    let ariaLabel = fallback($$props["ariaLabel"], void 0);
    let style = fallback($$props["style"], void 0);
    let orientation = fallback($$props["orientation"], "vertical");
    let fitViewOptions = fallback($$props["fitViewOptions"], void 0);
    let className = fallback($$props["class"], "");
    const {
      zoomIn,
      zoomOut,
      fitView,
      viewport,
      minZoom,
      maxZoom,
      nodesDraggable,
      nodesConnectable,
      elementsSelectable
    } = useStore();
    const buttonProps = {
      bgColor: buttonBgColor,
      bgColorHover: buttonBgColorHover,
      color: buttonColor,
      colorHover: buttonColorHover,
      borderColor: buttonBorderColor
    };
    isInteractive = store_get($$store_subs ??= {}, "$nodesDraggable", nodesDraggable) || store_get($$store_subs ??= {}, "$nodesConnectable", nodesConnectable) || store_get($$store_subs ??= {}, "$elementsSelectable", elementsSelectable);
    minZoomReached = store_get($$store_subs ??= {}, "$viewport", viewport).zoom <= store_get($$store_subs ??= {}, "$minZoom", minZoom);
    maxZoomReached = store_get($$store_subs ??= {}, "$viewport", viewport).zoom >= store_get($$store_subs ??= {}, "$maxZoom", maxZoom);
    orientationClass = orientation === "horizontal" ? "horizontal" : "vertical";
    Panel($$renderer2, {
      class: cc(["svelte-flow__controls", orientationClass, className]),
      position,
      "data-testid": "svelte-flow__controls",
      "aria-label": ariaLabel ?? "Svelte Flow controls",
      style,
      children: ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        slot($$renderer3, $$props, "before", {});
        $$renderer3.push(`<!--]--> `);
        if (showZoom) {
          $$renderer3.push("<!--[-->");
          ControlButton($$renderer3, spread_props([
            {
              class: "svelte-flow__controls-zoomin",
              title: "zoom in",
              "aria-label": "zoom in",
              disabled: maxZoomReached
            },
            buttonProps,
            {
              children: ($$renderer4) => {
                Plus($$renderer4);
              },
              $$slots: { default: true }
            }
          ]));
          $$renderer3.push(`<!----> `);
          ControlButton($$renderer3, spread_props([
            {
              class: "svelte-flow__controls-zoomout",
              title: "zoom out",
              "aria-label": "zoom out",
              disabled: minZoomReached
            },
            buttonProps,
            {
              children: ($$renderer4) => {
                Minus($$renderer4);
              },
              $$slots: { default: true }
            }
          ]));
          $$renderer3.push(`<!---->`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> `);
        if (showFitView) {
          $$renderer3.push("<!--[-->");
          ControlButton($$renderer3, spread_props([
            {
              class: "svelte-flow__controls-fitview",
              title: "fit view",
              "aria-label": "fit view"
            },
            buttonProps,
            {
              children: ($$renderer4) => {
                Fit($$renderer4);
              },
              $$slots: { default: true }
            }
          ]));
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> `);
        if (showLock) {
          $$renderer3.push("<!--[-->");
          ControlButton($$renderer3, spread_props([
            {
              class: "svelte-flow__controls-interactive",
              title: "toggle interactivity",
              "aria-label": "toggle interactivity"
            },
            buttonProps,
            {
              children: ($$renderer4) => {
                if (isInteractive) {
                  $$renderer4.push("<!--[-->");
                  Unlock($$renderer4);
                } else {
                  $$renderer4.push("<!--[!-->");
                  Lock($$renderer4);
                }
                $$renderer4.push(`<!--]-->`);
              },
              $$slots: { default: true }
            }
          ]));
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> <!--[-->`);
        slot($$renderer3, $$props, "default", {});
        $$renderer3.push(`<!--]--> <!--[-->`);
        slot($$renderer3, $$props, "after", {});
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, {
      position,
      showZoom,
      showFitView,
      showLock,
      buttonBgColor,
      buttonBgColorHover,
      buttonColor,
      buttonColorHover,
      buttonBorderColor,
      ariaLabel,
      style,
      orientation,
      fitViewOptions,
      class: className
    });
  });
}
var BackgroundVariant;
(function(BackgroundVariant2) {
  BackgroundVariant2["Lines"] = "lines";
  BackgroundVariant2["Dots"] = "dots";
  BackgroundVariant2["Cross"] = "cross";
})(BackgroundVariant || (BackgroundVariant = {}));
function DotPattern($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let radius = fallback($$props["radius"], 5);
    let className = fallback($$props["class"], "");
    $$renderer2.push(`<circle${attr("cx", radius)}${attr("cy", radius)}${attr("r", radius)}${attr_class(clsx(cc(["svelte-flow__background-pattern", "dots", className])))}></circle>`);
    bind_props($$props, { radius, class: className });
  });
}
function LinePattern($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let lineWidth = fallback($$props["lineWidth"], 1);
    let dimensions = $$props["dimensions"];
    let variant = fallback($$props["variant"], void 0);
    let className = fallback($$props["class"], "");
    $$renderer2.push(`<path${attr("stroke-width", lineWidth)}${attr("d", `M${dimensions[0] / 2} 0 V${dimensions[1]} M0 ${dimensions[1] / 2} H${dimensions[0]}`)}${attr_class(clsx(cc(["svelte-flow__background-pattern", variant, className])))}></path>`);
    bind_props($$props, { lineWidth, dimensions, variant, class: className });
  });
}
const defaultSize = {
  [BackgroundVariant.Dots]: 1,
  [BackgroundVariant.Lines]: 1,
  [BackgroundVariant.Cross]: 6
};
function Background($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let patternId, scaledGap, scaledSize, patternDimensions, patternOffset;
    let id2 = fallback($$props["id"], void 0);
    let variant = fallback($$props["variant"], () => BackgroundVariant.Dots, true);
    let gap = fallback($$props["gap"], 20);
    let size = fallback($$props["size"], 1);
    let lineWidth = fallback($$props["lineWidth"], 1);
    let bgColor = fallback($$props["bgColor"], void 0);
    let patternColor = fallback($$props["patternColor"], void 0);
    let patternClass = fallback($$props["patternClass"], void 0);
    let className = fallback($$props["class"], "");
    const { viewport, flowId } = useStore();
    const patternSize = size || defaultSize[variant];
    const isDots = variant === BackgroundVariant.Dots;
    const isCross = variant === BackgroundVariant.Cross;
    const gapXY = Array.isArray(gap) ? gap : [gap, gap];
    patternId = `background-pattern-${store_get($$store_subs ??= {}, "$flowId", flowId)}-${id2 ? id2 : ""}`;
    scaledGap = [
      gapXY[0] * store_get($$store_subs ??= {}, "$viewport", viewport).zoom || 1,
      gapXY[1] * store_get($$store_subs ??= {}, "$viewport", viewport).zoom || 1
    ];
    scaledSize = patternSize * store_get($$store_subs ??= {}, "$viewport", viewport).zoom;
    patternDimensions = isCross ? [scaledSize, scaledSize] : scaledGap;
    patternOffset = isDots ? [scaledSize / 2, scaledSize / 2] : [patternDimensions[0] / 2, patternDimensions[1] / 2];
    $$renderer2.push(`<svg${attr_class(clsx(cc(["svelte-flow__background", className])), "svelte-2izb27")} data-testid="svelte-flow__background"${attr_style("", {
      "--xy-background-color-props": bgColor,
      "--xy-background-pattern-color-props": patternColor
    })}><pattern${attr("id", patternId)}${attr("x", store_get($$store_subs ??= {}, "$viewport", viewport).x % scaledGap[0])}${attr("y", store_get($$store_subs ??= {}, "$viewport", viewport).y % scaledGap[1])}${attr("width", scaledGap[0])}${attr("height", scaledGap[1])} patternUnits="userSpaceOnUse"${attr("patternTransform", `translate(-${patternOffset[0]},-${patternOffset[1]})`)}>`);
    if (isDots) {
      $$renderer2.push("<!--[-->");
      DotPattern($$renderer2, { radius: scaledSize / 2, class: patternClass });
    } else {
      $$renderer2.push("<!--[!-->");
      LinePattern($$renderer2, {
        dimensions: patternDimensions,
        variant,
        lineWidth,
        class: patternClass
      });
    }
    $$renderer2.push(`<!--]--></pattern><rect x="0" y="0" width="100%" height="100%"${attr("fill", `url(#${patternId})`)}></rect></svg>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, {
      id: id2,
      variant,
      gap,
      size,
      lineWidth,
      bgColor,
      patternColor,
      patternClass,
      class: className
    });
  });
}
function MinimapNode($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let x = $$props["x"];
    let y = $$props["y"];
    let width = fallback($$props["width"], 0);
    let height = fallback($$props["height"], 0);
    let borderRadius = fallback($$props["borderRadius"], 5);
    let color2 = fallback($$props["color"], void 0);
    let shapeRendering = $$props["shapeRendering"];
    let strokeColor = fallback($$props["strokeColor"], void 0);
    let strokeWidth = fallback($$props["strokeWidth"], 2);
    let selected = fallback($$props["selected"], false);
    let className = fallback($$props["class"], "");
    $$renderer2.push(`<rect${attr_class(clsx(cc(["svelte-flow__minimap-node", className])), void 0, { "selected": selected })}${attr("x", x)}${attr("y", y)}${attr("rx", borderRadius)}${attr("ry", borderRadius)}${attr("width", width)}${attr("height", height)}${attr_style(`${color2 ? `fill: ${color2};` : ""}${strokeColor ? `stroke: ${strokeColor};` : ""}${strokeWidth ? `stroke-width: ${strokeWidth};` : ""}`)}${attr("shape-rendering", shapeRendering)}></rect>`);
    bind_props($$props, {
      x,
      y,
      width,
      height,
      borderRadius,
      color: color2,
      shapeRendering,
      strokeColor,
      strokeWidth,
      selected,
      class: className
    });
  });
}
const getAttrFunction = (func) => func instanceof Function ? func : () => func;
function Minimap($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let viewBB, elementWidth, elementHeight, scaledWidth, scaledHeight, viewScale, viewWidth, viewHeight, offset, x, y, viewboxWidth, viewboxHeight;
    let position = fallback($$props["position"], "bottom-right");
    let ariaLabel = fallback($$props["ariaLabel"], "Mini map");
    let nodeStrokeColor = fallback($$props["nodeStrokeColor"], "transparent");
    let nodeColor = fallback($$props["nodeColor"], void 0);
    let nodeClass = fallback($$props["nodeClass"], "");
    let nodeBorderRadius = fallback($$props["nodeBorderRadius"], 5);
    let nodeStrokeWidth = fallback($$props["nodeStrokeWidth"], 2);
    let bgColor = fallback($$props["bgColor"], void 0);
    let maskColor = fallback($$props["maskColor"], void 0);
    let maskStrokeColor = fallback($$props["maskStrokeColor"], void 0);
    let maskStrokeWidth = fallback($$props["maskStrokeWidth"], void 0);
    let width = fallback($$props["width"], void 0);
    let height = fallback($$props["height"], void 0);
    let pannable = fallback($$props["pannable"], true);
    let zoomable = fallback($$props["zoomable"], true);
    let inversePan = fallback($$props["inversePan"], void 0);
    let zoomStep = fallback($$props["zoomStep"], void 0);
    let style = fallback($$props["style"], "");
    let className = fallback($$props["class"], "");
    const defaultWidth = 200;
    const defaultHeight = 150;
    const {
      nodes,
      nodeLookup,
      viewport,
      width: containerWidth,
      height: containerHeight,
      flowId,
      panZoom,
      translateExtent
    } = useStore();
    const nodeColorFunc = nodeColor === void 0 ? void 0 : getAttrFunction(nodeColor);
    const nodeStrokeColorFunc = getAttrFunction(nodeStrokeColor);
    const nodeClassFunc = getAttrFunction(nodeClass);
    const shapeRendering = typeof window === "undefined" || !!window.chrome ? "crispEdges" : "geometricPrecision";
    const labelledBy = `svelte-flow__minimap-desc-${store_get($$store_subs ??= {}, "$flowId", flowId)}`;
    let boundingRect = viewBB;
    viewBB = {
      x: -store_get($$store_subs ??= {}, "$viewport", viewport).x / store_get($$store_subs ??= {}, "$viewport", viewport).zoom,
      y: -store_get($$store_subs ??= {}, "$viewport", viewport).y / store_get($$store_subs ??= {}, "$viewport", viewport).zoom,
      width: store_get($$store_subs ??= {}, "$containerWidth", containerWidth) / store_get($$store_subs ??= {}, "$viewport", viewport).zoom,
      height: store_get($$store_subs ??= {}, "$containerHeight", containerHeight) / store_get($$store_subs ??= {}, "$viewport", viewport).zoom
    };
    {
      boundingRect = store_get($$store_subs ??= {}, "$nodeLookup", nodeLookup).size > 0 ? getBoundsOfRects(getInternalNodesBounds(store_get($$store_subs ??= {}, "$nodeLookup", nodeLookup), { filter: (n) => !n.hidden }), viewBB) : viewBB;
      store_get($$store_subs ??= {}, "$nodes", nodes);
    }
    elementWidth = width ?? defaultWidth;
    elementHeight = height ?? defaultHeight;
    scaledWidth = boundingRect.width / elementWidth;
    scaledHeight = boundingRect.height / elementHeight;
    viewScale = Math.max(scaledWidth, scaledHeight);
    viewWidth = viewScale * elementWidth;
    viewHeight = viewScale * elementHeight;
    offset = 5 * viewScale;
    x = boundingRect.x - (viewWidth - boundingRect.width) / 2 - offset;
    y = boundingRect.y - (viewHeight - boundingRect.height) / 2 - offset;
    viewboxWidth = viewWidth + offset * 2;
    viewboxHeight = viewHeight + offset * 2;
    Panel($$renderer2, {
      position,
      style: style + (bgColor ? `;--xy-minimap-background-color-props:${bgColor}` : ""),
      class: cc(["svelte-flow__minimap", className]),
      "data-testid": "svelte-flow__minimap",
      children: ($$renderer3) => {
        if (store_get($$store_subs ??= {}, "$panZoom", panZoom)) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<svg${attr("width", elementWidth)}${attr("height", elementHeight)}${attr("viewBox", `${stringify(x)} ${stringify(y)} ${stringify(viewboxWidth)} ${stringify(viewboxHeight)}`)} class="svelte-flow__minimap-svg" role="img"${attr("aria-labelledby", labelledBy)}${attr_style("", {
            "--xy-minimap-mask-background-color-props": maskColor,
            "--xy-minimap-mask-stroke-color-props": maskStrokeColor,
            "--xy-minimap-mask-stroke-width-props": maskStrokeWidth ? maskStrokeWidth * viewScale : void 0
          })}>`);
          if (ariaLabel) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<title${attr("id", labelledBy)}>${escape_html(ariaLabel)}</title>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--><!--[-->`);
          const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$nodes", nodes));
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let userNode = each_array[$$index];
            const node = store_get($$store_subs ??= {}, "$nodeLookup", nodeLookup).get(userNode.id);
            if (node && nodeHasDimensions(node)) {
              $$renderer3.push("<!--[-->");
              const nodeDimesions = getNodeDimensions(node);
              MinimapNode($$renderer3, spread_props([
                {
                  x: node.internals.positionAbsolute.x,
                  y: node.internals.positionAbsolute.y
                },
                nodeDimesions,
                {
                  selected: node.selected,
                  color: nodeColorFunc?.(node),
                  borderRadius: nodeBorderRadius,
                  strokeColor: nodeStrokeColorFunc(node),
                  strokeWidth: nodeStrokeWidth,
                  shapeRendering,
                  class: nodeClassFunc(node)
                }
              ]));
            } else {
              $$renderer3.push("<!--[!-->");
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]--><path class="svelte-flow__minimap-mask"${attr("d", `M${stringify(x - offset)},${stringify(y - offset)}h${stringify(viewboxWidth + offset * 2)}v${stringify(viewboxHeight + offset * 2)}h${stringify(-viewboxWidth - offset * 2)}z
      M${stringify(viewBB.x)},${stringify(viewBB.y)}h${stringify(viewBB.width)}v${stringify(viewBB.height)}h${stringify(-viewBB.width)}z`)} fill-rule="evenodd" pointer-events="none"></path></svg>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, {
      position,
      ariaLabel,
      nodeStrokeColor,
      nodeColor,
      nodeClass,
      nodeBorderRadius,
      nodeStrokeWidth,
      bgColor,
      maskColor,
      maskStrokeColor,
      maskStrokeWidth,
      width,
      height,
      pannable,
      zoomable,
      inversePan,
      zoomStep,
      style,
      class: className
    });
  });
}
function WorkflowEditor($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { nodes = [], edges = [], onNodesChange, onEdgesChange } = $$props;
    let selectedNode = null;
    let selectedEdge = null;
    const nodeTypes = {
      httpCall: "default",
      transform: "default",
      delay: "default",
      terminate: "default",
      conditional: "default"
    };
    const edgeTypes = { default: "smoothstep" };
    function handleNodeClick(event) {
      selectedNode = event.detail.node;
      selectedEdge = null;
    }
    function handleEdgeClick(event) {
      selectedEdge = event.detail.edge;
      selectedNode = null;
    }
    function handlePaneClick() {
      selectedNode = null;
      selectedEdge = null;
    }
    function handleConnect(event) {
      const { source, target, sourceHandle, targetHandle } = event.detail;
      const newEdge = {
        id: `e${source}-${target}`,
        source,
        target,
        sourceHandle,
        targetHandle,
        type: "smoothstep",
        animated: true
      };
      edges = [...edges, newEdge];
      if (onEdgesChange) {
        onEdgesChange(edges);
      }
    }
    function handleNodeDragStop(event) {
      if (onNodesChange) {
        onNodesChange(nodes);
      }
    }
    function handleNodesDelete(event) {
      const deletedNodes = event.detail.nodes;
      const deletedNodeIds = new Set(deletedNodes.map((n) => n.id));
      nodes = nodes.filter((n) => !deletedNodeIds.has(n.id));
      edges = edges.filter((e) => !deletedNodeIds.has(e.source) && !deletedNodeIds.has(e.target));
      if (onNodesChange) {
        onNodesChange(nodes);
      }
      if (onEdgesChange) {
        onEdgesChange(edges);
      }
    }
    function handleEdgesDelete(event) {
      const deletedEdges = event.detail.edges;
      const deletedEdgeIds = new Set(deletedEdges.map((e) => e.id));
      edges = edges.filter((e) => !deletedEdgeIds.has(e.id));
      if (onEdgesChange) {
        onEdgesChange(edges);
      }
    }
    $$renderer2.push(`<div class="workflow-editor svelte-1oj5zx8">`);
    SvelteFlow($$renderer2, {
      nodes,
      edges,
      nodeTypes,
      edgeTypes,
      fitView: true,
      snapToGrid: true,
      snapGrid: [15, 15],
      defaultEdgeOptions: { type: "smoothstep", animated: true },
      onNodeClick: handleNodeClick,
      onEdgeClick: handleEdgeClick,
      onPaneClick: handlePaneClick,
      onConnect: handleConnect,
      onNodeDragStop: handleNodeDragStop,
      onNodesDelete: handleNodesDelete,
      onEdgesDelete: handleEdgesDelete,
      children: ($$renderer3) => {
        Background($$renderer3, { variant: "dots", gap: 12, size: 1 });
        $$renderer3.push(`<!----> `);
        Controls($$renderer3, {});
        $$renderer3.push(`<!----> `);
        Minimap($$renderer3, { nodeStrokeWidth: 3, zoomable: true, pannable: true });
        $$renderer3.push(`<!----> `);
        Panel($$renderer3, {
          position: "top-left",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="info-panel svelte-1oj5zx8"><h3 class="svelte-1oj5zx8">Workflow Editor</h3> <p class="hint svelte-1oj5zx8">`);
            if (selectedNode) {
              $$renderer4.push("<!--[-->");
              $$renderer4.push(`Selected: <strong>${escape_html(selectedNode.data.label)}</strong>`);
            } else {
              $$renderer4.push("<!--[!-->");
              if (selectedEdge) {
                $$renderer4.push("<!--[-->");
                $$renderer4.push(`Selected: Edge`);
              } else {
                $$renderer4.push("<!--[!-->");
                $$renderer4.push(`Click a node to configure it`);
              }
              $$renderer4.push(`<!--]-->`);
            }
            $$renderer4.push(`<!--]--></p></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Panel($$renderer3, {
          position: "top-right",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="stats-panel svelte-1oj5zx8"><div class="stat svelte-1oj5zx8"><span class="label svelte-1oj5zx8">Nodes:</span> <span class="value svelte-1oj5zx8">${escape_html(nodes.length)}</span></div> <div class="stat svelte-1oj5zx8"><span class="label svelte-1oj5zx8">Connections:</span> <span class="value svelte-1oj5zx8">${escape_html(edges.length)}</span></div></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!---->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { nodes, edges });
  });
}
export {
  WorkflowEditor as W
};
