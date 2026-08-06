// 好奇图鉴 - 首页逻辑
// 数据流：onLoad 请求仪表盘数据 → setData 渲染 → 交互触发拍照/弹窗/跳转

const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { CATEGORIES, CATEGORY_LIST } = require('../../utils/constants');
const { formatDiscoveryTime, parseRarityTags } = require('../../utils/format');

Page({
  /**
   * 页面数据状态
   */
  data: {
    // 仪表盘数据：累计发现数、连续天数、最近发现列表
    dashboard: {
      totalDiscoveries: 0,
      streakCount: 0,
      recentDiscoveries: []
    },
    // 是否显示隐私政策弹窗
    showPrivacyModal: false,
    // 是否仅浏览模式
    isBrowseOnly: false,
    // 分类 emoji 映射，用于列表渲染
    categoryEmojiMap: {}
  },

  /**
   * 页面加载
   */
  onLoad() {
    this.initCategoryEmojiMap();
    this.checkPrivacyStatus();
    this.loadDashboard();
  },

  /**
   * 初始化分类 emoji 映射
   * 说明：将分类数组转换为 { insect: '🦋', plant: '🌿' } 格式，方便 wxml 使用
   */
  initCategoryEmojiMap() {
    const map = {};
    CATEGORY_LIST.forEach(item => {
      map[item.key] = item.emoji;
    });
    this.setData({ categoryEmojiMap: map });
  },

  /**
   * 检查隐私政策状态
   * 说明：首次打开或未知状态时，弹出隐私政策弹窗
   */
  checkPrivacyStatus() {
    const shouldShow = auth.shouldShowPrivacyModal();
    this.setData({
      showPrivacyModal: shouldShow,
      isBrowseOnly: auth.isBrowseOnly()
    });
  },

  /**
   * 加载首页仪表盘数据
   * 说明：调用 api.getDashboard（当前为 mock），处理时间格式化
   */
  loadDashboard() {
    api.getDashboard().then(res => {
      const recentDiscoveries = res.recentDiscoveries.map(item => ({
        ...item,
        categoryLabel: (CATEGORIES[item.category.toUpperCase()] && CATEGORIES[item.category.toUpperCase()].label) || item.category,
        discoveredAtText: formatDiscoveryTime(item.discoveredAt),
        tags: parseRarityTags(item.rarityTags || [])
      }));

      this.setData({
        dashboard: {
          totalDiscoveries: res.totalDiscoveries,
          streakCount: res.streakCount,
          recentDiscoveries
        }
      });
    }).catch(error => {
      console.error('[index] 加载仪表盘数据失败', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    });
  },

  /**
   * 点击中央拍照入口
   * 说明：未同意隐私政策时弹窗；已同意时弹出拍照/相册选择器
   */
  onCameraEntryTap() {
    if (auth.isBrowseOnly()) {
      this.setData({ showPrivacyModal: true });
      return;
    }

    if (!auth.hasAgreedPrivacy()) {
      this.setData({ showPrivacyModal: true });
      return;
    }

    this.showCameraActionSheet();
  },

  /**
   * 显示拍照/相册选择器
   */
  showCameraActionSheet() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.takePhoto();
        } else {
          this.chooseFromAlbum();
        }
      }
    });
  },

  /**
   * 调用微信相机拍照
   */
  takePhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        this.identifyAndNavigate(res.tempFilePaths[0]);
      },
      fail: (error) => {
        this.handleChooseImageFail(error);
      }
    });
  },

  /**
   * 从相册选择照片
   */
  chooseFromAlbum() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.identifyAndNavigate(res.tempFilePaths[0]);
      },
      fail: (error) => {
        this.handleChooseImageFail(error);
      }
    });
  },

  /**
   * 处理选图失败
   * 说明：用户主动取消不提示；权限被拒绝时弹窗引导去系统设置开启
   * @param {Object} error - chooseImage 的 fail 回调参数
   */
  handleChooseImageFail(error) {
    const errMsg = (error && error.errMsg) || '';

    // 用户主动取消，静默处理
    if (errMsg.includes('cancel')) {
      return;
    }

    console.error('[index] 选图失败', error);
    wx.showModal({
      title: '无法获取照片',
      content: '请在设置中允许访问相机或相册，才能拍照识别',
      confirmText: '去设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  /**
   * 调用 mock 识别并跳转结果页
   * 说明：识别结果通过本地缓存传递给结果页（数据量大，不适合 URL 参数）；
   *       识别失败同样跳转，由结果页展示失败态与重拍/手动搜索入口
   * @param {String} imagePath - 照片临时路径
   * @param {Object} options - 透传给识别接口的参数（mock 阶段可带 scenario 测试场景）
   */
  identifyAndNavigate(imagePath, options = {}) {
    wx.showLoading({ title: '识别中...', mask: true });

    api.identifyImage(imagePath, options).then(result => {
      wx.hideLoading();
      result.userPhotoUrl = imagePath;
      wx.setStorageSync('identify_result', result);
      wx.navigateTo({
        url: '/pages/result/result?mode=identify'
      });
    }).catch(error => {
      wx.hideLoading();
      console.error('[index] 识别失败', error);
      wx.showToast({ title: '识别服务暂时开小差了，请稍后再试', icon: 'none' });
    });
  },

  /**
   * 长按拍照区：mock 场景测试入口
   * 说明：mock 阶段用于自测识别分支（低置信度/菌类/失败），接入真实接口后移除
   */
  onCameraEntryLongPress() {
    if (auth.isBrowseOnly() || !auth.hasAgreedPrivacy()) {
      this.setData({ showPrivacyModal: true });
      return;
    }

    wx.showActionSheet({
      itemList: ['正常识别', '低置信度（识别不确定）', '菌类（仅供参考）', '识别失败'],
      success: (res) => {
        const scenarioMap = ['normal', 'low_confidence', 'fungi', 'fail'];
        this.identifyAndNavigate('', { scenario: scenarioMap[res.tapIndex] });
      }
    });
  },

  /**
   * 用户同意隐私政策
   */
  onPrivacyAgree() {
    auth.agreePrivacy();
    this.setData({
      showPrivacyModal: false,
      isBrowseOnly: false
    });
  },

  /**
   * 用户选择仅浏览
   */
  onPrivacyBrowseOnly() {
    auth.chooseBrowseOnly();
    this.setData({
      showPrivacyModal: false,
      isBrowseOnly: true
    });
  },

  /**
   * 用户点击「查看完整隐私政策」
   */
  onViewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  /**
   * 关闭隐私弹窗
   * 说明：点击遮罩时触发，对于重要确认建议不关闭；当前保持弹窗开启
   */
  onPrivacyClose() {
    // 隐私弹窗不允许点遮罩关闭，保持显示
  },

  /**
   * 点击最近发现项
   * 说明：跳转结果页只读模式，展示该次发现的详细信息
   */
  onRecentItemTap(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/result/result?mode=readonly&id=${id}`
    });
  },

  /**
   * 点击「查看全部」
   */
  onViewAll() {
    wx.switchTab({
      url: '/pages/collection/collection'
    });
  }
});
