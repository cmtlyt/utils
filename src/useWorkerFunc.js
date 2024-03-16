/**
 * 将函数转为字符串
 * @param {Function} callback
 */
function funcToRunString(callback) {
  return `(${callback.toString()})`;
}

/**
 * 数组转为字符串,保留双引号
 * @param {Array<String>} list
 */
function getStringArray(list = []) {
  return `${list.map((item) => `"${item}"`)}`;
}

/**
 * 生成worker运行函数
 * @param {Function} callback
 * @param {Array<String>} importList
 */
function generateWorkerFunc(callback, importList = []) {
  return `${
    importList?.length
      ? `importScripts(${getStringArray(importList || [])});`
      : ""
  }

self.onmessage=async (e)=>{
  const result = await ${funcToRunString(callback)}(e.data)
  self.postMessage(result)
}
`;
}

/**
 * 生成worker的blob链接
 * @param {String} workerScript
 */
function generateWorkerLink(workerScript) {
  const blob = new Blob([workerScript], { type: "text/javascript" });
  const link = URL.createObjectURL(blob);

  return link;
}

/**
 * 获取字符串类型的key
 * @param {String} key
 */
function keyToString(key) {
  if (typeof key === "string") return key;
  if (typeof key === "object") return JSON.stringify(key);
  if (key.toString) return key.toString();
  return typeof key;
}

/**
 * 简易深度克隆对象
 * @param {any} data
 */
function deepClone(data) {
  if (typeof data !== "object") return data;
  return JSON.parse(JSON.stringify(data));
}

const useCache = (() => {
  const store = {};

  /**
   * 获取key对应的缓存值
   * @param {String} key
   * @param {any} value
   * @param {Boolean} forceSave
   */
  return (key, value, forceSave = false) => {
    key = keyToString(key);
    if (forceSave) {
      const result = (store[key] = value);
      return deepClone(result);
    }
    const result = (store[key] ??= value);
    return deepClone(result);
  };
})();

/**
 * 使用web worker运行函数
 * @param {Function} callback
 * @param {Array<String>} importScripts
 */
export function useWorkerFunc(callback = () => {}, importScripts = []) {
  const workerString = generateWorkerFunc(callback, importScripts);
  const workerLink = generateWorkerLink(workerString);

  function run(cache = false, arg) {
    if (cache) {
      const result = useCache(arg);
      if (result) return Promise.resolve(result);
    }
    const worker = new Worker(workerLink);
    return new Promise((resolve, reject) => {
      try {
        worker.onmessage = (e) => {
          resolve(useCache(arg, e.data, !cache));
          // 关闭worker
          worker.terminate();
        };
        worker.postMessage(arg);
      } catch (e) {
        reject(e);
      }
    });
  }

  return { run: (arg) => run(true, arg), reTry: (arg) => run(false, arg) };
}
