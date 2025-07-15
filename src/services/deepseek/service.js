/**
 * DeepSeek 服务
 * 整合配置和 API 客户端，提供高级功能
 */

import * as DeepSeekConfig from './config.js';
import * as DeepSeekApi from './api-client.js';
import * as Tools from '../../tools/index.js';

/**
 * 发送消息到 DeepSeek API
 * @param {string} message - 用户消息
 * @param {Object} options - 其他选项
 * @returns {Promise<Object>} - API 响应
 */
async function sendMessage(message, options = {}) {
  // 获取配置
  const apiKey = await DeepSeekConfig.getApiKey();
  const model = await DeepSeekConfig.getModel();

  if (!apiKey) {
    throw new Error('API密钥未设置，请在选项页面设置');
  }

  // 发送请求
  return await DeepSeekApi.sendChatRequest(apiKey, model, message, options);
}

/**
 * 发送流式消息到 DeepSeek API
 * @param {string} message - 用户消息
 * @param {function} onChunk - 处理每个响应块的回调函数
 * @param {Object} options - 其他选项
 * @returns {Promise<void>}
 */
async function sendStreamingMessage(message, onChunk, options = {}) {
  // 获取配置
  const apiKey = await DeepSeekConfig.getApiKey();
  const model = await DeepSeekConfig.getModel();

  if (!apiKey) {
    throw new Error('API密钥未设置，请在选项页面设置');
  }

  // 发送流式请求
  return await DeepSeekApi.sendStreamingChatRequest(apiKey, model, message, onChunk, options);
}

/**
 * 使用完整的参数发送聊天请求
 * @param {Object} params - 完整的API参数
 * @returns {Promise<Object>} - API响应
 */
async function chatWithParams(params) {
  // 获取配置
  const apiKey = await DeepSeekConfig.getApiKey();

  if (!apiKey) {
    throw new Error('API密钥未设置，请在选项页面设置');
  }

  // 如果没有指定模型，使用配置中的模型
  if (!params.model) {
    const model = await DeepSeekConfig.getModel();
    params.model = model;
  }

  // 添加工具定义（如果启用了工具）
  if (params.enableTools !== false) {
    params.tools = Tools.getToolDefinitions();
    params.tool_choice = "auto";
  }

  // 发送请求
  return await DeepSeekApi.chat(apiKey, params);
}

/**
 * 使用完整的参数发送流式聊天请求
 * @param {Object} params - 完整的API参数
 * @param {function} onChunk - 处理每个响应块的回调函数
 * @param {Object} options - 额外选项，如 signal 用于中断请求
 * @returns {Promise<void>}
 */
async function chatStreamWithParams(params, onChunk, options = {}) {
  // 获取配置
  const apiKey = await DeepSeekConfig.getApiKey();

  if (!apiKey) {
    throw new Error('API密钥未设置，请在选项页面设置');
  }

  // 如果没有指定模型，使用配置中的模型
  if (!params.model) {
    const model = await DeepSeekConfig.getModel();
    params.model = model;
  }

  // 强制设置为流式
  params.stream = true;

  // 添加工具定义（如果启用了工具）
  if (params.enableTools !== false) {
    params.tools = Tools.getToolDefinitions();
    params.tool_choice = "auto";
  }

  // 创建工具处理包装器
  const onChunkWithToolHandler = async (chunk) => {
    // 先调用原始回调
    onChunk(chunk);

    // 检查是否有工具调用
    if (chunk.choices &&
      chunk.choices[0] &&
      chunk.choices[0].delta &&
      chunk.choices[0].delta.tool_calls) {

      const toolCalls = chunk.choices[0].delta.tool_calls;

      // 处理工具调用
      for (const toolCall of toolCalls) {
        if (toolCall.function && toolCall.function.name) {
          try {
            // 解析参数
            const args = JSON.parse(toolCall.function.arguments || '{}');

            // 执行工具调用
            const result = await Tools.executeToolCall(toolCall.function.name, args);

            // 这里可以添加工具调用结果的处理逻辑
            console.log(`工具 ${toolCall.function.name} 执行结果:`, result);

            // 未来可以将结果发送回DeepSeek，作为新的消息
          } catch (error) {
            console.error(`执行工具 ${toolCall.function.name} 失败:`, error);
          }
        }
      }
    }
  };

  // 发送请求
  return await DeepSeekApi.chatStream(apiKey, params, onChunkWithToolHandler, options);
}

/**
 * 创建一个简单的聊天消息
 * @param {string} userMessage - 用户消息
 * @param {string} systemMessage - 系统消息（可选）
 * @returns {Array} - 消息数组
 */
function createChatMessages(userMessage, systemMessage = null) {
  const messages = [];

  // 添加系统消息（如果有）
  if (systemMessage) {
    messages.push({
      role: 'system',
      content: systemMessage
    });
  }

  // 添加用户消息
  messages.push({
    role: 'user',
    content: userMessage
  });

  return messages;
}

/**
 * 简化的聊天方法，支持系统消息和用户消息
 * @param {string} userMessage - 用户消息
 * @param {string} systemMessage - 系统消息（可选）
 * @param {Object} options - 其他选项
 * @returns {Promise<Object>} - API响应
 */
async function chat(userMessage, systemMessage = null, options = {}) {
  const messages = createChatMessages(userMessage, systemMessage);

  return await chatWithParams({
    messages,
    ...options
  });
}

/**
 * 简化的流式聊天方法，支持系统消息和用户消息
 * @param {string} userMessage - 用户消息
 * @param {function} onChunk - 处理每个响应块的回调函数
 * @param {string} systemMessage - 系统消息（可选）
 * @param {Object} options - 其他选项
 * @returns {Promise<void>}
 */
async function chatStream(userMessage, onChunk, systemMessage = null, options = {}) {
  const messages = createChatMessages(userMessage, systemMessage);

  return await chatStreamWithParams({
    messages,
    ...options
  }, onChunk);
}

/**
 * 检查服务配置是否完成
 * @returns {Promise<boolean>} 是否已配置
 */
async function isConfigured() {
  return await DeepSeekConfig.isApiKeySet();
}

/**
 * 打开设置页面
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// 导出所有配置函数
export const Config = {
  ...DeepSeekConfig
};

// 导出主要服务函数
export {
  sendMessage,
  sendStreamingMessage,
  chatWithParams,
  chatStreamWithParams,
  chat,
  chatStream,
  createChatMessages,
  isConfigured,
  openSettings
}; 