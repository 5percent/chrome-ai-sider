import * as DeepSeek from '../services/deepseek/index.js';

document.addEventListener('DOMContentLoaded', function () {
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model-select');
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const showHideBtn = document.getElementById('show-hide-btn');
  const statusMessage = document.getElementById('status-message');

  // 加载已保存的设置
  loadSettings();

  // 填充模型选择下拉框
  populateModelSelect();

  // 保存按钮点击事件
  saveBtn.addEventListener('click', function () {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!apiKey) {
      showStatus('请输入有效的API密钥', 'error');
      return;
    }

    // 保存设置
    DeepSeek.Config.saveAllConfig({
      apiKey: apiKey,
      model: model
    }).then(() => {
      showStatus('设置已保存', 'success');
    });
  });

  // 重置按钮点击事件
  resetBtn.addEventListener('click', function () {
    apiKeyInput.value = '';
    modelSelect.value = DeepSeek.DEFAULT_MODEL;
    showStatus('设置已重置，点击保存以应用', 'success');
  });

  // 显示/隐藏密钥按钮点击事件
  showHideBtn.addEventListener('click', function () {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
    } else {
      apiKeyInput.type = 'password';
    }
  });

  // 加载已保存的设置
  function loadSettings() {
    DeepSeek.Config.getAllConfig().then(config => {
      if (config.apiKey) {
        apiKeyInput.value = config.apiKey;
      }

      if (config.model) {
        modelSelect.value = config.model;
      }
    });
  }

  // 填充模型选择下拉框
  function populateModelSelect() {
    // 清空现有选项
    modelSelect.innerHTML = '';

    // 添加可用模型
    DeepSeek.AVAILABLE_MODELS.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });
  }

  // 显示状态消息
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;

    // 3秒后自动清除状态消息
    setTimeout(function () {
      statusMessage.textContent = '';
      statusMessage.className = '';
    }, 3000);
  }
}); 