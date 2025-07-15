/**
 * 工具注册器
 * 
 * 用于管理和注册所有可用的工具
 */

import openWindow, { toolDefinition as openWindowDefinition } from './openWindow.js';

// 所有工具的实现
const toolImplementations = {
  openWindow
};

// 所有工具的定义
const toolDefinitions = [
  openWindowDefinition
];

/**
 * 获取所有工具的定义
 * @returns {Array} 工具定义数组
 */
export function getToolDefinitions() {
  return toolDefinitions;
}

/**
 * 执行工具调用
 * @param {string} toolName - 工具名称
 * @param {Object} args - 工具参数
 * @returns {Promise<any>} 工具执行结果
 */
export async function executeToolCall(toolName, args) {
  const toolImplementation = toolImplementations[toolName];

  if (!toolImplementation) {
    throw new Error(`未找到工具: ${toolName}`);
  }

  try {
    return await toolImplementation(args.url, args);
  } catch (error) {
    console.error(`执行工具 ${toolName} 失败:`, error);
    throw error;
  }
}

// 导出所有工具的实现
export {
  openWindow
}; 