/**
 * DeepSeek 配置管理
 * 负责处理与 DeepSeek API 相关的配置，如 API 密钥和模型设置
 */

// 默认模型
const DEFAULT_MODEL = 'deepseek-reasoner';

// 可用模型列表
const AVAILABLE_MODELS = [
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat' }
];

/**
 * 获取 API 密钥
 * @returns {Promise<string>} API 密钥
 */
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey'], function (result) {
      resolve(result.apiKey || '');
    });
  });
}

/**
 * 设置 API 密钥
 * @param {string} apiKey - API 密钥
 * @returns {Promise<void>}
 */
async function setApiKey(apiKey) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ apiKey }, resolve);
  });
}

/**
 * 获取当前选择的模型
 * @returns {Promise<string>} 模型 ID
 */
async function getModel() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['model'], function (result) {
      resolve(result.model || DEFAULT_MODEL);
    });
  });
}

/**
 * 设置当前选择的模型
 * @param {string} model - 模型 ID
 * @returns {Promise<void>}
 */
async function setModel(model) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ model }, resolve);
  });
}

/**
 * 获取所有配置
 * @returns {Promise<Object>} 所有配置
 */
async function getAllConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'model'], function (result) {
      resolve({
        apiKey: result.apiKey || '',
        model: result.model || DEFAULT_MODEL
      });
    });
  });
}

/**
 * 保存所有配置
 * @param {Object} config - 配置对象
 * @returns {Promise<void>}
 */
async function saveAllConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({
      apiKey: config.apiKey || '',
      model: config.model || DEFAULT_MODEL
    }, resolve);
  });
}

/**
 * 检查是否已设置 API 密钥
 * @returns {Promise<boolean>} 是否已设置 API 密钥
 */
async function isApiKeySet() {
  const apiKey = await getApiKey();
  return !!apiKey;
}

// 导出函数和常量
export {
  DEFAULT_MODEL,
  AVAILABLE_MODELS,
  getApiKey,
  setApiKey,
  getModel,
  setModel,
  getAllConfig,
  saveAllConfig,
  isApiKeySet
}; 