// 好奇图鉴 - 分享卡片页逻辑
// 数据流：onLoad 读取分享数据 → 渲染预览卡片 → canvas 绘制 → 保存相册/微信分享

const { STORAGE_KEYS } = require('../../utils/constants');

// canvas 画布尺寸（导出时按 2 倍清晰度输出）
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 400;

Page({
  /**
   * 页面数据状态
   */
  data: {
    // 卡片数据：物种名、拉丁名、标签、发现信息等
    card: null,
    // 是否正在保存图片
    saving: false
  },

  /**
   * 页面加载：读取结果页写入的分享数据
   */
  onLoad() {
    let card;
    try {
      card = wx.getStorageSync(STORAGE_KEYS.SHARE_CARD);
    } catch (error) {
      card = null;
    }

    if (!card || !card.name) {
      wx.showToast({ title: '卡片数据不存在', icon: 'none' });
      return;
    }

    this.setData({ card });
  },

  /**
   * 点击「保存图片」
   * 说明：离屏 canvas 绘制卡片 → 导出临时文件 → 保存到相册；权限被拒时引导去设置
   */
  onSaveImage() {
    if (!this.data.card || this.data.saving) {
      return;
    }

    this.setData({ saving: true });
    this.drawCard().then(tempFilePath => {
      return new Promise((resolve, reject) => {
        wx.saveImageToPhotosAlbum({
          filePath: tempFilePath,
          success: resolve,
          fail: reject
        });
      });
    }).then(() => {
      this.setData({ saving: false });
      wx.showToast({ title: '已保存到相册', icon: 'none' });
    }).catch(error => {
      this.setData({ saving: false });
      this.handleSaveFail(error);
    });
  },

  /**
   * 用 canvas 绘制卡片并导出临时图片路径
   * @returns {Promise<String>} 临时文件路径
   */
  drawCard() {
    const card = this.data.card;
    const ctx = wx.createCanvasContext('shareCanvas', this);

    // 纸张白背景
    ctx.setFillStyle('#faf8f3');
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 顶部渐变区（生活照占位绿）
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 110);
    gradient.addColorStop(0, '#e8f5e9');
    gradient.addColorStop(1, '#d4edda');
    ctx.setFillStyle(gradient);
    ctx.fillRect(0, 0, CANVAS_WIDTH, 110);

    // 手绘粗边框
    ctx.setStrokeStyle('#3a3a3a');
    ctx.setLineWidth(3);
    ctx.strokeRect(8, 8, CANVAS_WIDTH - 16, CANVAS_HEIGHT - 16);

    // 物种 emoji
    ctx.setTextAlign('center');
    ctx.setFontSize(56);
    ctx.fillText(card.categoryEmoji || '🔍', CANVAS_WIDTH / 2, 82);

    // 物种名
    ctx.setFillStyle('#3a3a3a');
    ctx.setFontSize(26);
    ctx.fillText(card.name, CANVAS_WIDTH / 2, 155);

    // 拉丁名
    ctx.setFillStyle('#888888');
    ctx.setFontSize(13);
    ctx.fillText(card.latinName || '', CANVAS_WIDTH / 2, 180);

    // 稀有度标签（纯文字，竖排罗列）
    ctx.setFontSize(13);
    const tags = Array.isArray(card.tags) ? card.tags : [];
    tags.forEach((tag, index) => {
      ctx.setFillStyle('#4a9b5c');
      ctx.fillText(`· ${tag.label} ·`, CANVAS_WIDTH / 2, 215 + index * 24);
    });

    // 发现信息
    ctx.setFillStyle('#888888');
    ctx.setFontSize(12);
    const infoY = 225 + tags.length * 24;
    ctx.fillText(`${card.location} · ${card.discoveredAtText}`, CANVAS_WIDTH / 2, infoY);

    // 虚线分隔
    ctx.setStrokeStyle('#dddddd');
    ctx.setLineWidth(1);
    ctx.setLineDash([4, 4], 0);
    ctx.beginPath();
    ctx.moveTo(30, CANVAS_HEIGHT - 70);
    ctx.lineTo(CANVAS_WIDTH - 30, CANVAS_HEIGHT - 70);
    ctx.stroke();
    ctx.setLineDash([], 0);

    // 底部 slogan
    ctx.setFillStyle('#3a3a3a');
    ctx.setFontSize(14);
    ctx.fillText('好奇图鉴', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
    ctx.setFillStyle('#999999');
    ctx.setFontSize(11);
    ctx.fillText('珍惜你的每一次好奇心', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);

    return new Promise((resolve, reject) => {
      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'shareCanvas',
          destWidth: CANVAS_WIDTH * 2,
          destHeight: CANVAS_HEIGHT * 2,
          success: res => resolve(res.tempFilePath),
          fail: reject
        }, this);
      });
    });
  },

  /**
   * 处理保存失败
   * 说明：用户取消不提示；相册权限被拒时弹窗引导去系统设置
   */
  handleSaveFail(error) {
    const errMsg = (error && error.errMsg) || '';

    if (errMsg.includes('cancel')) {
      return;
    }

    if (errMsg.includes('auth deny') || errMsg.includes('authorize')) {
      wx.showModal({
        title: '无法保存图片',
        content: '请在设置中允许保存到相册',
        confirmText: '去设置',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting();
          }
        }
      });
      return;
    }

    console.error('[share-card] 保存失败', error);
    wx.showToast({ title: '保存失败，请重试', icon: 'none' });
  },

  /**
   * 分享给微信朋友
   */
  onShareAppMessage() {
    const card = this.data.card || {};
    return {
      title: `我在好奇图鉴发现了「${card.name || '新物种'}」，快来看看！`,
      path: '/pages/index/index'
    };
  }
});
