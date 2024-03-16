export class Counter {
  /**
   * 计算器
   * @param {Number} initValue 初始化的值
   * @param {Counter} parentCounter 父计算组
   */
  constructor(initValue = 0, parentCounter = null) {
    if (typeof initValue !== "number")
      throw new TypeError("initValue is not number");
    this._parentCounter = parentCounter;
    this._numberList = [initValue];
  }
  _numberHandler(number) {
    let _number = number;
    if (typeof number !== "function") _number = () => number;
    number = _number();
    if (number.get) number = number.get();
    if (typeof number !== "number") throw new TypeError("number is not number");
    return number;
  }
  /**
   * 加法
   * @param {Number|()=>Counter} number
   */
  addition(number = 0) {
    this._numberList.push(this._numberHandler(number));
    return this;
  }
  /**
   * 减法
   * @param {Number|()=>Counter} number
   */
  subtraction(number = 0) {
    this._numberList.push(this._numberHandler(-number));
    return this;
  }
  /**
   * 乘法
   * @param {Number|()=>Counter} number
   */
  multiplication(number = 1) {
    this._numberList[this._numberList.length - 1] *=
      this._numberHandler(number);
    return this;
  }
  /**
   * 除法
   * @param {Number|()=>Counter} number
   */
  division(number = 1) {
    this._numberList[this._numberList.length - 1] /=
      this._numberHandler(number);
    return this;
  }
  /**
   * 初始化Number
   * @param {Number|()=>Counter} number
   */
  setInitValue(number = 0) {
    this._numberList[0] = this._numberHandler(number);
    return this;
  }
  /**
   * 创建组
   * @param {(counter:Counter)=>Counter} callback
   */
  static group(callback) {
    const groupCounter = new Counter();
    callback(groupCounter);
    return groupCounter;
  }
  /**
   * 获取计算结果
   */
  get() {
    return this._numberList.reduce((pre, cur) => pre + cur);
  }
}
