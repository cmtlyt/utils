import { runMicroTask } from "./runMicroTask";

/**
 * 判断是否为Promise
 * @param {any} obj
 * @returns Boolean
 */
function isPromise(obj) {
  return !!obj && typeof obj === "object" && typeof obj.then === "function";
}

// 记录Promise的状态
const CLPROMISE_STATUS = {
  pending: "pending",
  fulfilled: "fulfilled",
  rejected: "rejected",
};

export class ClPromise {
  /**
   * 创建一个Promise
   * @param {Function} executor 任务执行器
   */
  constructor(executor) {
    this._state = CLPROMISE_STATUS.pending;
    this._value = void 0;
    this._handlers = [];
    try {
      executor(this._resolve.bind(this), this._reject.bind(this));
    } catch (e) {
      this._reject(e);
    }
  }
  /**
   * 向处理队列中添加一个函数
   * @param {Function} executor 添加的函数
   * @param {String} state 该函数什么状态下执行
   * @param {Function} resolve 让this函数返回的Promise成功
   * @param {Function} reject 让this函数返回的Promise失败
   */
  _pushHandler(executor, state, resolve, reject) {
    this._handlers.push({
      executor,
      state,
      resolve,
      reject,
    });
  }
  /**
   * 根据实际情况执行函数
   */
  _runHandlers() {
    if (this._state === CLPROMISE_STATUS.pending) return;
    let handler;
    while ((handler = this._handlers.shift())) {
      this._runOneHandle(handler);
    }
  }
  /**
   * 处理一个handler
   * @param {Object} handler
   * @param {Function} handler.executor
   * @param {String} handler.state
   * @param {Function} handler.resolve
   * @param {Function} handler.reject
   */
  _runOneHandle(handler) {
    const { executor, state, resolve, reject } = handler;
    const currentState = this._state;
    runMicroTask(() => {
      if (currentState !== state) return;
      if (typeof executor !== "function") {
        this._state === CLPROMISE_STATUS.fulfilled
          ? resolve(this._value)
          : reject(this._value);
        return;
      }
      try {
        const result = executor(this._value);
        if (isPromise(result)) {
          result.then(resolve, reject);
          return;
        }
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  }
  /**
   * 改变状态和数据
   * @param {String} newState 新状态
   * @param {any} value 相关数据
   */
  _changeState(newState, value) {
    // 如果状态不为pending的话则不修改状态和数据
    if (this._state !== CLPROMISE_STATUS.pending) return;
    this._state = newState;
    this._value = value;
    this._runHandlers();
  }
  /**
   * 标记当前任务完成
   * @param {any} data 任务完成的相关参数
   */
  _resolve(data) {
    // 改变状态和数据
    this._changeState(CLPROMISE_STATUS.fulfilled, data);
  }
  /**
   * 标记当前任务失败
   * @param {any} reason 任务失败的相关参数
   */
  _reject(reason) {
    // 改变状态和数据
    this._changeState(CLPROMISE_STATUS.rejected, reason);
  }
  /**
   * Promise A+ 规范的this
   * @param {Function} onFulfilled
   * @param {Function} onRejected
   */
  then(onFulfilled, onRejected) {
    return new ClPromise((resolve, reject) => {
      this._pushHandler(
        onFulfilled,
        CLPROMISE_STATUS.fulfilled,
        resolve,
        reject
      );
      this._pushHandler(onRejected, CLPROMISE_STATUS.rejected, resolve, reject);
      // 执行队列
      this._runHandlers();
    });
  }
  /**
   * 只处理失败的场景
   * @param {Function} onRejected
   */
  catch(onRejected) {
    return this.then(null, onRejected);
  }
  /**
   * 不管Promise是什么结果都会执行这个回调函数
   * @param {Function} onSettled
   */
  finally(onSettled) {
    return this.then(
      (data) => {
        onSettled();
        return data;
      },
      (reason) => {
        onSettled();
        throw reason;
      }
    );
  }
  /**
   * 返回一个已完成的Promise
   *
   * 情况分析:
   * 1. 传递的data本身就是ES6的Promise对象,直接返回data
   * 2. 传递的data是PromiseLike (Promise A+),返回一个新的Promise,状态和其保持一致
   * 3. data是其他值,直接返回一个成功的Promise对象,值为data
   * @param {any} data
   * @returns
   */
  static resolve(data) {
    if (data instanceof ClPromise) return data;
    return new ClPromise((resolve, reject) => {
      if (isPromise(data)) data.then(resolve, reject);
      else resolve(data);
    });
  }
  /**
   * 得到一个被拒绝的Promise
   * @param {any} reason
   * @returns
   */
  static reject(reason) {
    return new ClPromise((_, reject) => reject(reason));
  }
  /**
   * 得到一个新的Promise
   * 该Promise的状态取决于proms的执行
   * proms是一个迭代器,包含多个Promise
   * 全部Promise成功,则返回的Promise成功,数据为所有Promise成功的数据,并顺序按照传入的顺序排列
   * 只要有一个Promise失败,则返回的Promise失败,原因是第一个失败的Promise的原因
   * @param {Iterator} proms
   */
  static all(proms) {
    const results = [];
    let count = 0;
    let fulfilledCount = 0;
    return new ClPromise((resolve, reject) => {
      try {
        for (const prom of proms) {
          const index = count++;
          ClPromise.resolve(prom).then((data) => {
            results[index] = data;
            ++fulfilledCount;
            if (fulfilledCount === count) resolve(results);
          }, reject);
        }
        if (count === 0) {
          resolve(results);
        }
      } catch (e) {
        reject(e);
      }
    });
  }
}
