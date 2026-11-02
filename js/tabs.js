/**
 * 作者：王烨
 * 建立时间：2026-11-02
 * 使用模型：DeepSeek-V4.1-Flash
 * 功能名称：ReusableTabs（可复用选项卡组件）
 * 功能简介：为页面上任意带有 data-tabs 的容器提供选项卡切换能力，
 *          支持多组选项卡独立运行，切换时先清除所有选中状态再设置当前项。
 * 命名规则：所有 CSS 类名、id、JS 变量均以 wy 开头。
 */
(function () {
  'use strict';

  var wyActiveClass = 'wy-is-active';

  /**
   * 作者：王烨
   * 建立时间：2026-11-02
   * 使用模型：DeepSeek-V4.1-Flash
   * 功能名称：wyClearActive
   * 功能简介：清除容器内所有选项卡按钮与内容面板的选中状态。
   */
  function wyClearActive(wyTabs, wyPanels) {
    wyTabs.forEach(function (wyTab) {
      wyTab.classList.remove(wyActiveClass);
      wyTab.setAttribute('aria-selected', 'false');
      wyTab.setAttribute('tabindex', '-1');
    });

    wyPanels.forEach(function (wyPanel) {
      wyPanel.classList.remove(wyActiveClass);
      wyPanel.hidden = true;
    });
  }

  /**
   * 作者：王烨
   * 建立时间：2026-11-02
   * 使用模型：DeepSeek-V4.1-Flash
   * 功能名称：wyActivate
   * 功能简介：先清除全部选中状态，再把当前选项卡及其对应面板设为选中状态。
   */
  function wyActivate(wyRoot, wyTarget) {
    var wyTabs = Array.prototype.slice.call(wyRoot.querySelectorAll('[data-tab]'));
    var wyPanels = Array.prototype.slice.call(wyRoot.querySelectorAll('[data-panel]'));
    var wyTabName = wyTarget.getAttribute('data-tab');
    var wyPanel = wyRoot.querySelector('[data-panel="' + wyTabName + '"]');

    wyClearActive(wyTabs, wyPanels);

    wyTarget.classList.add(wyActiveClass);
    wyTarget.setAttribute('aria-selected', 'true');
    wyTarget.setAttribute('tabindex', '0');

    if (wyPanel) {
      wyPanel.classList.add(wyActiveClass);
      wyPanel.hidden = false;
    }
  }

  /**
   * 作者：王烨
   * 建立时间：2026-11-02
   * 使用模型：DeepSeek-V4.1-Flash
   * 功能名称：wyHandleClick
   * 功能简介：选项卡事件监听回调，通过事件委托定位被点击的选项卡并切换。
   */
  function wyHandleClick(wyEvent) {
    var wyTarget = wyEvent.target.closest('[data-tab]');

    if (!wyTarget) {
      return;
    }

    var wyRoot = wyTarget.closest('[data-tabs]');

    if (!wyRoot) {
      return;
    }

    wyActivate(wyRoot, wyTarget);
  }

  /**
   * 作者：王烨
   * 建立时间：2026-11-02
   * 使用模型：DeepSeek-V4.1-Flash
   * 功能名称：wyInitTabs
   * 功能简介：为单个选项卡容器绑定点击监听，并激活默认选项卡。
   */
  function wyInitTabs(wyRoot) {
    var wyNav = wyRoot.querySelector('[data-tablist]');

    if (!wyNav) {
      return;
    }

    wyNav.addEventListener('click', wyHandleClick);

    var wyDefaultTab = wyRoot.querySelector('[data-tab].' + wyActiveClass) ||
      wyRoot.querySelector('[data-tab]');

    if (wyDefaultTab) {
      wyActivate(wyRoot, wyDefaultTab);
    }
  }

  /**
   * 作者：王烨
   * 建立时间：2026-11-02
   * 使用模型：DeepSeek-V4.1-Flash
   * 功能名称：wyInitAll
   * 功能简介：初始化页面上所有选项卡容器，实现组件复用。
   */
  function wyInitAll() {
    Array.prototype.slice.call(document.querySelectorAll('[data-tabs]'))
      .forEach(wyInitTabs);
  }

  window.wyReusableTabs = {
    init: wyInitTabs,
    initAll: wyInitAll
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wyInitAll);
  } else {
    wyInitAll();
  }
})();
