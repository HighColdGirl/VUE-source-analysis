//构建watcher与dep关系
function Watcher(vm, exp, cb) {
    this.cb = cb;//回调函数
    this.vm = vm;
    this.exp = exp;//表达式
    this.depIds = {};//存储dep用下标和分配的唯一depId
    this.value = this.get();//核心主要构建dep和watch关系
}

Watcher.prototype = {
    update: function() {
        this.run();
    },
    run: function() {
        var value = this.get();//新值
        var oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;
            //调用new watcher中和回调传参
            this.cb.call(this.vm, value, oldVal);
        }
    },
    addDep: function(dep) {
        //watcher判断是否有当前dep
        if (!this.depIds.hasOwnProperty(dep.id)) {
            dep.addSub(this);
            this.depIds[dep.id] = dep;
        }
    },
    get: function() {
        Dep.target = this;
        var value = this.getVMVal(); //  构建dep与watcher的多对多方法
        Dep.target = null;//数据双向绑定开关
        return value;
    },

    /* 1. data中的每一个属性都对应了一个dep
       2. 每一个指令(v-  ; {{}}) 都对应了一个watcher
       3. dep与watcher要构建一个多对多关系
          dep  得知道自己被多少个 watcher所引用着
              dep 靠一个数组 subs存watcher [watcher]
          watcher 得知道它控制着多少个 dep
              watcher 靠一个对象 depIds存dep {0:dep0,1:dep1 .... }*/

    //构建dep和watcher的关系
    getVMVal: function() {
        var exp = this.exp.split('.');
        var val = this.vm._data;
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    }
};