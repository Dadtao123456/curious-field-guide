// 隐私政策弹窗组件
// 说明：独立组件，只负责展示和触发事件，不处理业务逻辑

Component({
  /**
   * 组件属性
   */
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 用户点击「同意并继续」
     * 说明：触发 agree 事件，由页面调用全局方法处理
     */
    onAgree() {
      this.triggerEvent('agree');
    },

    /**
     * 用户点击「仅浏览」
     * 说明：触发 browseOnly 事件
     */
    onBrowseOnly() {
      this.triggerEvent('browseOnly');
    },

    /**
     * 用户点击「查看完整隐私政策」
     * 说明：触发 viewPolicy 事件
     */
    onViewFullPolicy() {
      this.triggerEvent('viewPolicy');
    },

    /**
     * 点击遮罩关闭弹窗
     * 说明：隐私弹窗属于重要确认，原则上不应通过点遮罩关闭；这里仅触发 close 事件
     */
    onMaskTap() {
      this.triggerEvent('close');
    },

    /**
     * 阻止点击内容区时冒泡到遮罩
     */
    onContainerTap() {
      // 什么都不做，仅阻止冒泡
    }
  }
});
