export const runMicroTask = (() => {
  const runFunc = (() => {
    // 判断node环境
    try {
      if (process && process.nextTick) return process.nextTick;
    } catch {}
    // 判断浏览器环境
    if (MutationObserver)
      return (callback) => {
        const observer = new MutationObserver(() => {
          observer.disconnect();
          callback();
        });
        const $text = document.createElement("span");
        observer.observe($text, { childList: true });
        $text.textContent = "_";
      };
    return (callback) => setTimeout(callback, 0);
  })();
  /**
   * 运行一个为队列任务
   * 把传递的函数放到为队列中
   * @param {Function} callback
   */
  return (callback) => {
    runFunc(callback);
  };
})();
