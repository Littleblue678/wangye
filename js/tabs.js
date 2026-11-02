/**
 * 作者：王烨
 * 建立时间：2026-11-02
 * 使用模型：DeepSeek-V4.1-Flash
 * 功能名称：ReusableTabs（可复用选项卡组件）
 * 功能简介：为页面上任意带有 data-tabs 的容器提供选项卡切换能力，
 *          支持多组选项卡独立运行，切换时先清除所有选中状态再设置当前项。
 */
(function () {
  'use strict';

  var ACTIVE_CLASS = 'is-active';

  /**
   * 作者：王烨
   * 建立时间：2026-11-02
   * 使用模型：DeepSeek-V4.1-Flash
   * 功能名称：clearActive
   * 功能简介：清除容器内所有选项卡按钮与内容面板的选中状态。
   */
  function clearActive(tabs, panels) {
    tabs.forEach(function (tab) {
      tab.classList.remove(ACTIVE_CLASS);
      tab.setAttribute('aria-selected', 'false');
      tab.setAttribute('tabindex', '-1');
    });

    panels.forEach(function (panel) {
      panel.classList.remove(ACTIVE_CLASS);
      panel.hidden = true;
    });
  }

  /**
   * 作者：王烨
   * 建立时间：2026-11-02
   * 使用模型：DeepSeek-V4.1-Flash
   * 功能名称：activate
   * 功能简介：先清除全部选中状态，再把当前选项卡及其对应面板设为选中状态。
   */
  function activate(root, target) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-tab]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[data-panel]'));
    var id = target.getAttribute('data-tab');
    var panel = root.querySelector('[data-panel="' + id + '"]');

    clearActive(tabs, panels);

    target.classList.add(ACTIVE_CLASS);
    target.setAttribute('aria-selected', 'true');
    target.setAttribute('tabindex', '0');

    if (panel) {
      panel.classList.add(ACTIVE_CLASS);
      panel.hidden = false;
    }
  }

  /**
   * 作者：王烨
   * 建立时间：2026-11-02
   * 使用模型：DeepSeek-V4.1-Flash
   * 功能名称：handleClick
   * 功能简介：选项卡事件监听回调，通过事件委托定位被点击的选项卡并切换。
   */
  function handleClick(event) {
    var target = event.target.closest('[data-tab]');

    if (!target) {
      return;
    }

    var root = target.closest('[data-tabs]');

    if (!root) {
      return;
    }

    activate(root, target);
  }

  /**
   * 作者：王烨
   * 建立时间：2026-11-02
   * 使用模型：DeepSeek-V4.1-Flash
   * 功能名称：initTabs
   * 功能简介：为单个选项卡容器绑定点击监听，并激活默认选项卡。
   */
  function initTabs(root) {
    var nav = root.querySelector('[data-tablist]');

    if (!nav) {
      return;
    }

    nav.addEventListener('click', handleClick);

    var defaultTab = root.querySelector('[data-tab].' + ACTIVE_CLASS) ||
      root.querySelector('[data-tab]');

    if (defaultTab) {
      activate(root, defaultTab);
    }
  }

  /**
   * 作者：王烨
   * 建立时间：2026-11-02
   * 使用模型：DeepSeek-V4.1-Flash
   * 功能名称：initAll
   * 功能简介：初始化页面上所有选项卡容器，实现组件复用。
   */
  function initAll() {
    Array.prototype.slice.call(document.querySelectorAll('[data-tabs]'))
      .forEach(initTabs);
  }

  window.ReusableTabs = {
    init: initTabs,
    initAll: initAll
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
