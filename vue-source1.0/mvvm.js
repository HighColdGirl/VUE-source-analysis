
function MVVM(options) {
    //转存到MVVM
    this.$options = options;
    var data = this._data = this.$options.data;
    //后面出现回掉函数处理this指向
    var me = this;

    //一、数据代理
    /* 1. 数据代理
     首先获取到配置对象的data属性 绑给vm实例对象
     将当前这个data对象所有的可枚举属性一一拿出来 转绑给vm实例对象
         data中的属性都是数据描述符
         转绑给vm实例对象时 全部变成访问描述符
                 get 读原始数据源
                 set 改原始的数据源*/
    Object.keys(data).forEach(function(key) {
        // keys（）返回可枚举数据属性
        me._proxy(key);
    });

    //二、数据劫持
    observe(data, this);

    //三、指令解析
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxy: function(key) {
        //传入的key为代理data属性
        var me = this;
        //将data中数据描述符重新定义成访问描述符
        Object.defineProperty(me, key, {
            configurable: false,
            enumerable: true,

            get: function proxyGetter() {
                return me._data[key];
            },
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    }
};