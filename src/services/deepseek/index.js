/**
 * DeepSeek 服务索引文件
 * 导出所有 DeepSeek 相关功能
 */

import * as DeepSeekService from './service.js';
import * as DeepSeekConfig from './config.js';
import * as DeepSeekApi from './api-client.js';

// 导出主要服务函数
export const {
  sendMessage,
  sendStreamingMessage,
  chatWithParams,
  chatStreamWithParams,
  chat,
  chatStream,
  createChatMessages,
  isConfigured,
  openSettings,
  Config
} = DeepSeekService;

// 导出配置相关
export const {
  DEFAULT_MODEL,
  AVAILABLE_MODELS
} = DeepSeekConfig;

// 为高级用例导出原始 API 和配置
export const Api = DeepSeekApi;
export const RawConfig = DeepSeekConfig; 