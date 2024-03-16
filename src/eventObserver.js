const OBSERVE_PRE_KEY = "observe";
const DEL_OBSERVE_PRE_KEY = "del_observe";

const observeCrypto = {
  /**
   * 获取事件名和id
   * @param {String} key
   * @param {String} preKey
   * @returns {[String,String]}
   */
  decode(key, preKey) {
    return key.replace(preKey, "").toLowerCase().split("#");
  },
  /**
   * 获取事件对象字符串
   * @param {String} handle
   * @param {String} eventName
   * @param {String} id
   * @returns {[String,String]}
   */
  encode(handle, eventName, id) {
    return [`${handle}${eventName}#${id}`, `${eventName}#${id}`];
  },
};

/**
 * 获取元素代理
 * @param {String|HTMLElement} selector
 * @returns {Array<HTMLElement>}
 */
function getElements(selector) {
  /**@type {Array<HTMLElement>} */
  const $doms = (() => {
    if (typeof selector === "string")
      return Array.from(document.querySelectorAll(selector));
    if (Array.isArray(selector)) return selector;
    if (selector) return [selector];
    return null;
  })();
  if (!$doms) return null;
  return $doms.map(($dom) => {
    const symbolMap = {};
    return new Proxy($dom, {
      /**@param {String} key */
      get(target, key) {
        if (key.startsWith(OBSERVE_PRE_KEY)) {
          const [eventName, eventId] = observeCrypto.decode(
            key,
            OBSERVE_PRE_KEY
          );
          const observeSymbol =
            symbolMap[eventName]?.[eventId] || Symbol(eventName);
          symbolMap[eventName] ??= {};
          symbolMap[eventName][eventId] = observeSymbol;
          return new Promise((resolve) => {
            $dom[observeSymbol] = resolve;
            $dom.addEventListener(eventName, resolve, { once: true });
          });
        }
        if (key.startsWith(DEL_OBSERVE_PRE_KEY)) {
          const [eventName, eventId] = observeCrypto.decode(
            key,
            DEL_OBSERVE_PRE_KEY
          );
          if (!(eventName in symbolMap)) return false;
          const observeSymbol = symbolMap[eventName][eventId];
          $dom.removeEventListener(eventName, $dom[observeSymbol]);
          delete $dom[observeSymbol];
          return true;
        }
        return Reflect.get(target, key);
      },
    });
  });
}

/**
 * @typedef {Object} EventObserver
 * @property {(eventName:String,callback:(event:Event)=>void,id?:String)=>EventObserver} observe
 * @property {(eventName:String,id:String)=>EventObserver} unObserve
 */

/**
 * 获取元素代理
 * @param {String|HTMLElement} selector
 * @returns {EventObserver}
 */
export function eventObserver(selector) {
  const $doms = getElements(selector);
  if (!$doms) return null;
  const eventSignMap = new WeakMap();
  return {
    observe(eventName, callback, id = "") {
      const [observeKey, _eventName] = observeCrypto.encode(
        OBSERVE_PRE_KEY,
        eventName,
        id
      );
      $doms.forEach(($dom) => {
        if (!eventSignMap.has($dom)) eventSignMap.set($dom, {});
        const eventSigns = eventSignMap.get($dom);
        if (_eventName in eventSigns)
          $dom[observeCrypto.encode(DEL_OBSERVE_PRE_KEY, eventName, id)[0]];
        eventSigns[_eventName] = true;
        void (async () => {
          while (eventSigns[_eventName]) {
            const event = await $dom[observeKey];
            callback.call($dom, event);
          }
        })();
      });
      return this;
    },
    unObserve(eventName, id = "") {
      const [observeKey, _eventName] = observeCrypto.encode(
        DEL_OBSERVE_PRE_KEY,
        eventName,
        id
      );
      $doms.forEach(($dom) => {
        if (!eventSignMap.has($dom)) eventSignMap.set($dom, {});
        const eventSigns = eventSignMap.get($dom);
        eventSigns[_eventName] = false;
        $dom[observeKey];
      });
      return this;
    },
  };
}
