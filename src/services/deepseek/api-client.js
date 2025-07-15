/**
 * DeepSeek API 客户端
 * 负责处理与 DeepSeek API 的所有交互
 */

// API 基础 URL
const API_BASE_URL = 'https://api.deepseek.com';

/**
 * 发送聊天请求到 DeepSeek API
 * @param {string} apiKey - DeepSeek API 密钥
 * @param {string} model - 使用的模型名称
 * @param {string} message - 用户消息
 * @param {Object} options - 其他选项（如温度、最大令牌数等）
 * @returns {Promise<Object>} - API 响应
 */
async function sendChatRequest(apiKey, model, message, options = {}) {
  if (!apiKey) {
    throw new Error('API密钥未设置，请在选项页面设置');
  }

  if (!message) {
    throw new Error('消息不能为空');
  }

  const defaultOptions = {
    temperature: 0.7,
    max_tokens: 1000,
    stream: false
  };

  const requestOptions = { ...defaultOptions, ...options };

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          // 可以在这里添加系统消息
          // { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message }
        ],
        ...requestOptions
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API响应错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('DeepSeek API 请求失败:', error);
    throw error;
  }
}

/**
 * 发送流式聊天请求到 DeepSeek API
 * @param {string} apiKey - DeepSeek API 密钥
 * @param {string} model - 使用的模型名称
 * @param {string} message - 用户消息
 * @param {function} onChunk - 处理每个响应块的回调函数
 * @param {Object} options - 其他选项（如温度、最大令牌数等）
 * @returns {Promise<void>}
 */
async function sendStreamingChatRequest(apiKey, model, message, onChunk, options = {}) {
  if (!apiKey) {
    throw new Error('API密钥未设置，请在选项页面设置');
  }

  if (!message) {
    throw new Error('消息不能为空');
  }

  const defaultOptions = {
    temperature: 0.7,
    max_tokens: 1000,
    stream: true
  };

  const requestOptions = { ...defaultOptions, ...options };

  // 提取 AbortSignal（如果有）
  const { signal } = options;

  // 监听中断信号
  let aborted = false;
  if (signal) {
    if (signal.aborted) {
      // 如果已经被中断，直接返回
      console.log('请求已被取消');
      return;
    }

    // 添加中断事件监听器
    signal.addEventListener('abort', () => {
      aborted = true;
      console.log('请求被用户取消');
    });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          // 可以在这里添加系统消息
          // { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message }
        ],
        ...requestOptions
      }),
      signal // 传递 AbortSignal 给 fetch
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API响应错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';

    while (true) {
      // 检查是否已被中断
      if (aborted) {
        console.log('流式请求已被用户取消，正在退出');
        break; // 优雅退出循环而不是抛出异常
      }

      try {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 解码收到的数据
        buffer += decoder.decode(value, { stream: true });

        // 处理数据行
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim() === '[DONE]') {
              continue;
            }

            try {
              const chunk = JSON.parse(jsonStr);
              onChunk(chunk);
            } catch (e) {
              console.error('解析流数据失败:', e, jsonStr);
            }
          }
        }
      } catch (readError) {
        // 如果是因为中断导致的错误，优雅处理
        if (aborted) {
          console.log('读取流时检测到中断，正在退出');
          break;
        } else {
          // 其他错误则重新抛出
          throw readError;
        }
      }
    }

    // 如果是因为中断而退出的，通知调用者
    if (aborted) {
      // 创建一个特殊的错误对象，但不抛出
      return Promise.reject(new DOMException('用户取消了请求', 'AbortError'));
    }
  } catch (error) {
    // 如果是因为中断导致的错误（fetch API自己抛出的AbortError），优雅处理
    if (error.name === 'AbortError') {
      console.log('请求被中断');
      return Promise.reject(new DOMException('用户取消了请求', 'AbortError'));
    }

    console.error('DeepSeek API 流式请求失败:', error);
    throw error;
  }
}

/**
 * 完整的聊天API，支持所有DeepSeek API参数
 * @param {string} apiKey - DeepSeek API密钥
 * @param {Object} params - 完整的API参数
 * @returns {Promise<Object>} - API响应
 */
async function chat(apiKey, params) {
  if (!apiKey) {
    throw new Error('API密钥未设置，请在选项页面设置');
  }

  if (!params.messages || params.messages.length === 0) {
    throw new Error('消息不能为空');
  }

  // 默认参数
  const defaultParams = {
    model: 'deepseek-chat',
    frequency_penalty: 0,
    max_tokens: 2048,
    presence_penalty: 0,
    response_format: {
      type: 'text'
    },
    stop: null,
    stream: false,
    stream_options: null,
    temperature: 0.7,
    top_p: 1,
    tools: null,
    tool_choice: 'none',
    logprobs: false,
    top_logprobs: null
  };

  // 合并默认参数和用户提供的参数
  const requestParams = { ...defaultParams, ...params };

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API响应错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('DeepSeek API 请求失败:', error);
    throw error;
  }
}

/**
 * 流式聊天API，支持所有DeepSeek API参数
 * @param {string} apiKey - DeepSeek API密钥
 * @param {Object} params - 完整的API参数
 * @param {function} onChunk - 处理每个响应块的回调函数
 * @param {Object} options - 额外选项，如 signal 用于中断请求
 * @returns {Promise<void>}
 */
async function chatStream(apiKey, params, onChunk, options = {}) {
  if (!apiKey) {
    throw new Error('API密钥未设置，请在选项页面设置');
  }

  if (!params.messages || params.messages.length === 0) {
    throw new Error('消息不能为空');
  }

  // 默认参数
  const defaultParams = {
    model: 'deepseek-chat',
    frequency_penalty: 0,
    max_tokens: 2048,
    presence_penalty: 0,
    response_format: {
      type: 'text'
    },
    stop: null,
    stream: true,  // 确保流式处理
    stream_options: null,
    temperature: 0.7,
    top_p: 1,
    tools: null,
    tool_choice: 'none',
    logprobs: false,
    top_logprobs: null
  };

  // 合并默认参数和用户提供的参数，强制设置stream为true
  const requestParams = { ...defaultParams, ...params, stream: true };

  try {
    // 提取 AbortSignal（如果有）
    const { signal } = options;

    // 监听中断信号
    let aborted = false;
    if (signal) {
      if (signal.aborted) {
        // 如果已经被中断，直接返回
        console.log('请求已被取消');
        return;
      }

      // 添加中断事件监听器
      signal.addEventListener('abort', () => {
        aborted = true;
        console.log('请求被用户取消');
      });
    }

    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestParams),
      signal // 传递 AbortSignal 给 fetch
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API响应错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';

    while (true) {
      // 检查是否已被中断
      if (aborted) {
        console.log('流式请求已被用户取消，正在退出');
        break; // 优雅退出循环而不是抛出异常
      }

      try {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 解码收到的数据
        buffer += decoder.decode(value, { stream: true });

        // 处理数据行
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim() === '[DONE]') {
              continue;
            }

            try {
              const chunk = JSON.parse(jsonStr);
              onChunk(chunk);
            } catch (e) {
              console.error('解析流数据失败:', e, jsonStr);
            }
          }
        }
      } catch (readError) {
        // 如果是因为中断导致的错误，优雅处理
        if (aborted) {
          console.log('读取流时检测到中断，正在退出');
          break;
        } else {
          // 其他错误则重新抛出
          throw readError;
        }
      }
    }

    // 如果是因为中断而退出的，通知调用者
    if (aborted) {
      // 创建一个特殊的错误对象，但不抛出
      return Promise.reject(new DOMException('用户取消了请求', 'AbortError'));
    }
  } catch (error) {
    // 如果是因为中断导致的错误（fetch API自己抛出的AbortError），优雅处理
    if (error.name === 'AbortError') {
      console.log('请求被中断');
      return Promise.reject(new DOMException('用户取消了请求', 'AbortError'));
    }

    console.error('DeepSeek API 流式请求失败:', error);
    throw error;
  }
}

// 导出函数
export {
  sendChatRequest,
  sendStreamingChatRequest,
  chat,
  chatStream
}; 