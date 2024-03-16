// 字符类型
const CharType = {
  upcase: "upcase",
  lowcase: "lowcase",
  number: "number",
  idSign: "idSign",
  classSign: "classSign",
  childrenSign: "childrenSign",
  dashSign: "dashSign",
  sonSign: "sonSign",
  pseudoClassSign: "pseudoClassSign",
  anySign: "anySign",
};

// 选择器权重
const SignWeight = {
  ".": 1,
  "#": 0,
  "": 2,
  ":": 1,
  "::": 2,
};

// 确认选择器值
function confirmValue(info, sign = ".") {
  let tempName = info.tempName;
  if (!tempName) throw new SyntaxError(`非法结尾字符:> '${sign}'`);
  const oldClassNameLength = tempName.length;
  tempName = tempName.trim();
  if (tempName.length !== oldClassNameLength)
    throw new SyntaxError(
      `非法结尾字符:> '${info.replace(/\s/g, sign)}${sign}'`
    );
  delete info.tempName;
  info.weight ??= [0, 0, 0];
  if (sign in SignWeight) ++info.weight[SignWeight[sign]];
  return tempName;
}

// 类选择器状态机
function classSelector(selector, info = {}) {
  if (!selector.length) {
    info.className ??= [];
    info.className.push(confirmValue(info, "."));
    return info;
  }
  const char = selector[0];
  const charType = getCharType(char);
  if (isName(charType)) {
    if (charType === CharType.number && !info.tempName?.length)
      throw new SyntaxError("类名不能以数字开头");
    info.tempName ??= "";
    info.className ??= [];
    info.tempName += char;
    return classSelector(selector.slice(1), info);
  }
  return selectorParse(selector, info, charType, () => {
    info.className.push(confirmValue(info, "."));
  });
}

// 子孙选择器状态机
function childrenSelector(selector, info = {}) {
  if (!selector.length) return info;
  const char = selector[0];
  const charType = getCharType(char);
  if (charType === CharType.childrenSign) {
    return childrenSelector(selector.slice(1), info);
  }
  info.children = {};
  return selectorParse(
    selector,
    info,
    charType,
    {
      sonSign: () => {
        delete info.children;
      },
    },
    () => {
      delete info.children;
      throw SyntaxError(`非法字符:> ${char}`);
    }
  );
}

// 子选择器状态机
function sonSelector(selector, info = {}) {
  if (!selector.length) return info;
  const char = selector[0];
  const charType = getCharType(char);
  if (charType === CharType.sonSelector) {
    throw new SyntaxError("法非选择器:> '>>'");
  }
  if (charType === CharType.childrenSign) {
    return sonSelector(selector.slice(1), info);
  }
  info.son = {};
  return selectorParse(
    selector,
    info,
    charType,
    () => {},
    () => {
      delete info.son;
      throw SyntaxError(`非法字符:> '${char}'`);
    }
  );
}

// id选择器状态机
function idSelector(selector, info = {}) {
  if (!selector.length) {
    info.idName = confirmValue(info, "#");
    return info;
  }
  const char = selector[0];
  const charType = getCharType(char);
  if (isName(charType)) {
    if (charType === CharType.number && !info.tempName?.length)
      throw new SyntaxError("id名不能以数字开头");
    info.tempName ??= "";
    info.idName ??= "";
    info.tempName += char;
    return idSelector(selector.slice(1), info);
  }
  return selectorParse(selector, info, charType, () => {
    info.idName = confirmValue(info, "#");
  });
}

// 标签选择器状态机
function labelSelector(selector, info = {}) {
  if (!selector.length) {
    info.labelName = confirmValue(info, "");
    return info;
  }
  const char = selector[0];
  const charType = getCharType(char);
  if (isName(charType)) {
    if (charType === CharType.number && !info.tempName?.length)
      throw new SyntaxError("标签名不能以数字开头");
    info.tempName ??= "";
    info.tempName += char;
    return labelSelector(selector.slice(1), info);
  }
  return selectorParse(selector, info, charType, () => {
    info.labelName = confirmValue(info, "");
  });
}

// 伪元素选择器状态机
function pseudoElementSelector(selector, info) {
  if (!selector.length) {
    info.pseudoElement ??= {};
    info.pseudoElement.name = confirmValue(info, "::");
    return info;
  }
  const char = selector[0];
  const charType = getCharType(char);
  if (charType === CharType.pseudoClassSign && !info.tempName?.length) {
    throw new SyntaxError("意外的符号:> ':::'");
  }
  if (isName(charType)) {
    info.tempName ??= "";
    info.tempName += char;
    return pseudoElementSelector(selector.slice(1), info);
  }
  return selectorParse(selector, info, charType, () => {
    info.pseudoElement ??= {};
    info.pseudoElement.name = confirmValue(info, "::");
    console.log(info);
  });
}

// 伪类选择器状态机
function pseudoClassSelector(selector, info) {
  if (!selector.length) {
    info.pseudoClass ??= {};
    info.pseudoClass.name = confirmValue(info, ":");
    return info;
  }
  const char = selector[0];
  const charType = getCharType(char);
  if (charType === CharType.pseudoClassSign) {
    if (info.pseudoElement) {
      info.pseudoElement.children ??= {};
    }
    const _info = info.pseudoElement?.children || info;
    if (info.tempName?.length) {
      info.pseudoClass ??= {};
      info.pseudoClass.name = confirmValue(info, ":");
      pseudoClassSelector(selector.slice(1), _info);
      return info;
    }
    pseudoElementSelector(selector.slice(1), _info);
    return info;
  }
  if (isName(charType)) {
    info.tempName ??= "";
    info.tempName += char;
    return pseudoClassSelector(selector.slice(1), info);
  }
  return selectorParse(selector, info, charType, () => {
    info.pseudoClass ??= {};
    info.pseudoClass.name = confirmValue(info, ":");
  });
}

// 判断字符类型是否为合法的名称类型
function isName(charType) {
  return (
    charType === CharType.upcase ||
    charType === CharType.lowcase ||
    charType === CharType.number ||
    charType === CharType.dashSign
  );
}

// 选择器状态机入口
function selectorParse(
  selector,
  info = {},
  charType = "",
  callbackMap = {},
  fullback = () => {}
) {
  if (typeof callbackMap === "function") {
    callbackMap = Object.keys(CharType).reduce((result, key) => {
      result[key] = callbackMap;
      return result;
    }, {});
  }
  if (!charType) {
    charType = getCharType(selector[0]);
  }
  const _info = info.son || info.children || info;
  // 子孙选择器
  if (charType === CharType.childrenSign) {
    callbackMap[charType]?.();
    return childrenSelector(selector.slice(1), info);
  }
  // 子选择器
  if (charType === CharType.sonSign) {
    callbackMap[charType]?.();
    return sonSelector(selector.slice(1), info);
  }
  // id选择器
  if (charType === CharType.idSign) {
    callbackMap[charType]?.();
    idSelector(selector.slice(1), _info);
    return info;
  }
  // 类选择器
  if (charType === CharType.classSign) {
    callbackMap[charType]?.();
    classSelector(selector.slice(1), _info);
    return info;
  }
  // 标签选择器
  if (
    charType === CharType.lowcase ||
    charType === CharType.upcase ||
    charType === CharType.anySign
  ) {
    callbackMap[charType]?.();
    labelSelector(selector, _info);
    return info;
  }
  // 伪类选择器
  if (charType === CharType.pseudoClassSign) {
    callbackMap[charType]?.();
    pseudoClassSelector(selector.slice(1), _info);
    return info;
  }
  fullback();
}

// 获取字符类型
function getCharType(char) {
  char = char[0];
  if (char === " ") return CharType.childrenSign;
  if (char === "-") return CharType.dashSign;
  if (char >= "A" && char <= "Z") return CharType.upcase;
  if (char >= "a" && char <= "z") return CharType.lowcase;
  if (char >= "0" && char <= "9") return CharType.number;
  if (char === ".") return CharType.classSign;
  if (char === "#") return CharType.idSign;
  if (char === ">") return CharType.sonSign;
  if (char === ":") return CharType.pseudoClassSign;
}

// 选择器句法检查
function SyntaxCheck(selector) {
  const lastCharCheck = /.*[^a-zA-Z0-9]$/;
  if (
    selector
      .replace(/\s+/g, " ")
      .split(/\s?>\s?/)
      .map((item) => item.split(" "))
      .flat()
      .some((item) => lastCharCheck.test(item))
  ) {
    throw new SyntaxError(`末尾非法字符:> ${selector}`);
  }
}

// 权重求和
function sumWeight(...weights) {
  return weights.reduce(
    (result, curr) => {
      curr ??= [0, 0, 0];
      return [result[0] + curr[0], result[1] + curr[1], result[2] + curr[2]];
    },
    [0, 0, 0]
  );
}

// 获取选择器总权重
function getSelectorWeight(info, weight = [0, 0, 0]) {
  if (info.son) {
    return getSelectorWeight(info.son, sumWeight(info.weight, weight));
  }
  if (info.children) {
    return getSelectorWeight(info.children, sumWeight(info.weight, weight));
  }
  if (info.pseudoElement) {
    return getSelectorWeight(
      info.pseudoElement,
      sumWeight(info.weight, weight)
    );
  }
  const result = sumWeight(info.weight, weight);
  return result;
}

// 移除权重字段
function removeWeightField(info) {
  if (!info) return;
  removeWeightField(info.son);
  removeWeightField(info.children);
  removeWeightField(info.pseudoElement);
  delete info.weight;
  return info;
}

// 解析css选择器
export function parseCSSSelector(selector) {
  if (typeof selector !== "string") return [];
  selector = selector.trim();
  if (!selector.length) return [];
  const selectorList = selector
    .split(",")
    .map((item) => {
      SyntaxCheck(item);
      return {
        selector: item.trim(),
        selectorInfo: selectorParse(item.trim()),
      };
    })
    .filter((item) => item)
    .map(({ selector, selectorInfo }) => ({
      selector,
      weight: getSelectorWeight(selectorInfo),
      selectorInfo: removeWeightField(selectorInfo),
    }));
  return selectorList;
}
