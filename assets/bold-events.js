!function(t){function e(r){if(n[r])return n[r].exports;var s=n[r]={exports:{},id:r,loaded:!1};return t[r].call(s.exports,s,s.exports,e),s.loaded=!0,s.exports}var n={};return e.m=t,e.c=n,e.p="",e(0)}([function(t,e,n){t.exports=n(1)},function(t,e,n){"use strict";function r(t){return t&&t.__esModule?t:{default:t}}var s=n(2),o=r(s);window.BOLD=window.BOLD||{},window.BOLD.common=window.BOLD.common||{},window.BOLD.common.eventEmitter=window.BOLD.common.eventEmitter||new o.default},function(t,e,n){"use strict";function r(t,e,n){this.fn=t,this.context=e,this.once=n||!1}function s(){}var o=Object.prototype.hasOwnProperty,i="function"!=typeof Object.create&&"~";s.prototype._events=void 0,s.prototype.eventNames=function(){var t,e=this._events,n=[];if(!e)return n;for(t in e)o.call(e,t)&&n.push(i?t.slice(1):t);return Object.getOwnPropertySymbols?n.concat(Object.getOwnPropertySymbols(e)):n},s.prototype.listeners=function(t,e){var n=i?i+t:t,r=this._events&&this._events[n];if(e)return!!r;if(!r)return[];if(r.fn)return[r.fn];for(var s=0,o=r.length,c=new Array(o);s<o;s++)c[s]=r[s].fn;return c},s.prototype.emit=function(t,e,n,r,s,o){var c=i?i+t:t;if(!this._events||!this._events[c])return!1;var f,h,a=this._events[c],v=arguments.length;if("function"==typeof a.fn){switch(a.once&&this.removeListener(t,a.fn,void 0,!0),v){case 1:return a.fn.call(a.context),!0;case 2:return a.fn.call(a.context,e),!0;case 3:return a.fn.call(a.context,e,n),!0;case 4:return a.fn.call(a.context,e,n,r),!0;case 5:return a.fn.call(a.context,e,n,r,s),!0;case 6:return a.fn.call(a.context,e,n,r,s,o),!0}for(h=1,f=new Array(v-1);h<v;h++)f[h-1]=arguments[h];a.fn.apply(a.context,f)}else{var u,l=a.length;for(h=0;h<l;h++)switch(a[h].once&&this.removeListener(t,a[h].fn,void 0,!0),v){case 1:a[h].fn.call(a[h].context);break;case 2:a[h].fn.call(a[h].context,e);break;case 3:a[h].fn.call(a[h].context,e,n);break;default:if(!f)for(u=1,f=new Array(v-1);u<v;u++)f[u-1]=arguments[u];a[h].fn.apply(a[h].context,f)}}return!0},s.prototype.on=function(t,e,n){var s=new r(e,n||this),o=i?i+t:t;return this._events||(this._events=i?{}:Object.create(null)),this._events[o]?this._events[o].fn?this._events[o]=[this._events[o],s]:this._events[o].push(s):this._events[o]=s,this},s.prototype.once=function(t,e,n){var s=new r(e,n||this,!0),o=i?i+t:t;return this._events||(this._events=i?{}:Object.create(null)),this._events[o]?this._events[o].fn?this._events[o]=[this._events[o],s]:this._events[o].push(s):this._events[o]=s,this},s.prototype.removeListener=function(t,e,n,r){var s=i?i+t:t;if(!this._events||!this._events[s])return this;var o=this._events[s],c=[];if(e)if(o.fn)(o.fn!==e||r&&!o.once||n&&o.context!==n)&&c.push(o);else for(var f=0,h=o.length;f<h;f++)(o[f].fn!==e||r&&!o[f].once||n&&o[f].context!==n)&&c.push(o[f]);return c.length?this._events[s]=1===c.length?c[0]:c:delete this._events[s],this},s.prototype.removeAllListeners=function(t){return this._events?(t?delete this._events[i?i+t:t]:this._events=i?{}:Object.create(null),this):this},s.prototype.off=s.prototype.removeListener,s.prototype.addListener=s.prototype.on,s.prototype.setMaxListeners=function(){return this},s.prefixed=i,t.exports=s}]);