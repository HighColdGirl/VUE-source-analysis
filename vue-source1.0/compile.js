//指令解析
/*模板解析步骤
    1. 将挂载节点下的所有子节点放入文档碎片中
    2. 解析文档碎片(init)
            compileElement:
                拿到文档碎片中的所有子节点,根据节点类型进行不一样的处理
                    元素节点
                    带{{}}的文本节点
                        compileText: 从工具类(compileUtil)中找到指定的工具
                            text:专门处理{{}}的编译工具
                                bind: 工具类依赖的核心函数;
                                        去找更新器,为更新器提供数据(node exp在data中所对应的值)
                                    _getVMVal:找exp在data中所对应的值
                                        updaterFn:更新器去修改文档碎片
    3. 挂载解析完的文档碎片
  */

function Compile(el, vm) {

    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        //将挂载节点下的所有子节点剪切到文档碎片中
        this.$fragment = this.node2Fragment(this.$el);
        //解析文档碎片
        this.init();
        //将解析成功的文档碎片重新挂载回el底下
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    //将node节点剪切到文档碎片中
    node2Fragment: function(el) {
        // 创建文档碎片
        var fragment = document.createDocumentFragment(),
            child;//变量

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        //解析文档碎片
        this.compileElement(this.$fragment);
    },

    compileElement: function(el) {
        // 在文档碎片上的操作不会触发页面的重绘重排
        var childNodes = el.childNodes,
            me = this;

        /*Array.prototype.slice.call(childNodes)
          ES6将伪数组变成真数组（1.from；2.arr.slice.call）*/
        [].slice.call(childNodes).forEach(function(node) {
            //将页面标签内容抽出
            var text = node.textContent;
            var reg = /\{\{(.*)\}\}/;//定义（正则）规则

            if (me.isElementNode(node)) {
                //元素节点（是标签标签，看上面vue事件或指令）
                me.compile(node);
            } else if (me.isTextNode(node) && reg.test(text)) {
                //文本节点{{}}
                me.compileText(node, RegExp.$1);
            }

            if (node.childNodes && node.childNodes.length) {
                //如果还有子节点继续拆分
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        var nodeAttrs = node.attributes,
            me = this;

        [].slice.call(nodeAttrs).forEach(function(attr) {//伪变真
            var attrName = attr.name;
            if (me.isDirective(attrName)) {//判断前缀是V-,on还是其他
                //表达式
                var exp = attr.value;
                var dir = attrName.substring(2);

                if (me.isEventDirective(dir)) {// 事件指令
                    compileUtil.eventHandler(node, me.$vm, exp, dir);

                } else {// 普通指令
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }

                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },





    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
    //V-text
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },
    //V-html
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },
    //V-model
    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');
        //数据双向绑定逻辑
        var me = this,
            val = this._getVMVal(vm, exp);
        //给节点input标签加监听事件input输入触发回调
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            //输入数据不相同改值
            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },
    //
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    //所有指令工具都调用
    bind: function(node, vm, exp, dir) {
        var updaterFn = updater[dir + 'Updater'];//更新器

        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        //处理页面回调函数在watcher中
        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    _getVMVal: function(vm, exp) {
        //根据当前vm实例找到表达式的值
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        //响应式数据双向绑定输入改变触发set方法
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value; // 触发了set方法
            }
        });
    }
};


var updater = {
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};