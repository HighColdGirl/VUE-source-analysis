/*数据劫持:
    将data中的每一个数据描述符 重新定义成 访问描述符 (深度遍历)
    为data中的每一个属性分配了一个dep闭包!  dep.id*/

function Observer(data) {
    this.data = data;
    this.walk(data);
}

Observer.prototype = {
    walk: function(data) {
        var me = this;
        //弄出可枚举属性
        Object.keys(data).forEach(function(key) {
            me.convert(key, data[key]);
        });
    },
    convert: function(key, val) {
        this.defineReactive(this.data, key, val);
    },
    defineReactive: function(data, key, val) {
        //每一个data中的属性（包括深层次属性都一个dep闭包）
        var dep = new Dep();
        var childObj = observe(val);


        //真正的数据劫持的代码
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function() {
                if (Dep.target) {
                	//使用代码构建dep与watcher的多对多关系
                    dep.depend();
                }
                return val;
            },
            set: function(newVal) {
                if (newVal === val) {
                    return;
                }
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);
                // 通知订阅者
                dep.notify();
            }
        });
    }
};

//value是配置对象的data属性  ;  vm : new MVVM()
function observe(value, vm) {
    //判断值类型
    if (!value || typeof value !== 'object') {
        return;
    }
    return new Observer(value);
};


var uid = 0;

function Dep() {
    // 为每一个dep分配唯一的id值
    this.id = uid++;
    //放当前dep对应相关watcher
    this.subs = [];
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },

    depend: function() {
        Dep.target.addDep(this);
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },
    //相当于发布消息通知更新dep数组
    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};

Dep.target = null;