// src/siderbar/siderbar.js

import * as DeepSeek from '../services/deepseek/index.js';

document.addEventListener('DOMContentLoaded', () => {
  const sendButton = document.getElementById('send-button');
  const stopButton = document.getElementById('stop-button');
  const messageInput = document.getElementById('message-input');
  const chatMessages = document.getElementById('chat-messages');

  // 系统消息
  const systemMessage = "You are a helpful assistant. You have access to tools that can help you assist users better. When a user asks you to open a URL or website, use the openWindow tool to do so.";

  // 消息历史记录
  let messageHistory = [];

  // 当前流式请求的控制器
  let currentStreamController = null;

  // 当前响应容器和消息元素的ID
  let currentResponseContainerId = null;
  let currentResponseId = null;

  // 检查API密钥是否已设置
  checkApiKeyStatus();

  // 清除示例消息
  clearExampleMessages();

  function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText !== '' && !sendButton.disabled) {
      // 确保之前的响应已完成
      finishCurrentResponse();

      // 显示消息到内容区
      const messageContainer = document.createElement('div');
      messageContainer.classList.add('message-container', 'sent');
      const message = document.createElement('div');
      message.classList.add('message', 'sent');
      message.textContent = messageText;
      messageContainer.appendChild(message);
      chatMessages.appendChild(messageContainer);

      // 添加到历史记录
      messageHistory.push({
        role: 'user',
        content: messageText
      });

      // 清空输入框
      messageInput.value = '';

      // 生成唯一ID用于当前响应
      const responseId = `response-${Date.now()}`;
      const responseContainerId = `container-${Date.now()}`;
      currentResponseId = responseId;
      currentResponseContainerId = responseContainerId;

      // 创建AI响应容器（提前创建，用于流式更新）
      const responseContainer = createResponseContainer(responseContainerId, responseId);

      // 切换到停止按钮状态
      toggleButtonState(false);

      // 准备消息数组，包括历史记录
      const messages = prepareMessages(messageText);

      // 创建 AbortController 用于取消请求
      currentStreamController = new AbortController();
      const signal = currentStreamController.signal;

      // 使用流式请求发送消息到 DeepSeek API
      DeepSeek.chatStreamWithParams(
        {
          messages: messages,
          model: 'deepseek-chat',
          temperature: 0.7,
          max_tokens: 2048,
          enableTools: false // 启用工具
        },
        (chunk) => handleStreamChunk(chunk, responseId),
        { signal } // 传递 AbortSignal
      )
        .then(() => {
          // 流式请求完成后，切换回发送按钮状态
          toggleButtonState(true);
          currentStreamController = null;

          // 获取最终的响应文本
          const finalResponseElement = document.getElementById(responseId);
          const finalResponseText = finalResponseElement?.textContent || '';

          // 完成当前响应
          finishResponseById(responseId, responseContainerId);

          // 添加到历史记录
          if (finalResponseText) {
            messageHistory.push({
              role: 'assistant',
              content: finalResponseText
            });
          }
        })
        .catch(error => {
          // 如果是用户主动取消，不显示错误
          if (error.name === 'AbortError') {
            console.log('用户取消了请求');
            finishResponseById(responseId, responseContainerId);
          } else {
            // 处理其他错误
            showErrorMessage(error);
          }

          // 切换回发送按钮状态
          toggleButtonState(true);
          currentStreamController = null;
        });
    }
  }

  // 停止当前流式请求
  function stopStreaming() {
    if (currentStreamController) {
      // 取消当前请求
      currentStreamController.abort();
      currentStreamController = null;

      // 完成当前响应
      finishCurrentResponse();

      // 切换回发送按钮状态
      toggleButtonState(true);
    }
  }

  // 完成当前响应（移除流式样式，保存到历史记录）
  function finishCurrentResponse() {
    if (currentResponseId && currentResponseContainerId) {
      finishResponseById(currentResponseId, currentResponseContainerId);
    }
  }

  // 根据ID完成响应
  function finishResponseById(responseId, containerId) {
    // 获取响应元素
    const responseElement = document.getElementById(responseId);
    if (responseElement) {
      // 移除流式样式
      responseElement.classList.remove('streaming');

      // 如果是当前响应，重置当前响应ID
      if (responseId === currentResponseId) {
        currentResponseId = null;
        currentResponseContainerId = null;
      }
    }
  }

  // 准备消息数组，包括系统消息和历史记录
  function prepareMessages(currentMessage) {
    const messages = [];

    // 添加系统消息
    messages.push({
      role: 'system',
      content: systemMessage
    });

    // 添加历史记录（最多保留最近的10轮对话）
    const recentHistory = messageHistory.slice(-10);
    messages.push(...recentHistory);

    // 添加当前消息
    messages.push({
      role: 'user',
      content: currentMessage
    });

    return messages;
  }

  // 清除示例消息
  function clearExampleMessages() {
    // 检查是否有示例消息需要清除
    const exampleMessages = chatMessages.querySelectorAll('.message-container');
    if (exampleMessages.length > 0) {
      chatMessages.innerHTML = '';
    }
  }

  // 创建响应容器
  function createResponseContainer(containerId, responseId) {
    const responseContainer = document.createElement('div');
    responseContainer.classList.add('message-container', 'received');
    responseContainer.id = containerId;

    const responseMessage = document.createElement('div');
    responseMessage.classList.add('message', 'received', 'streaming');
    responseMessage.id = responseId;
    responseMessage.textContent = ''; // 初始为空

    responseContainer.appendChild(responseMessage);
    chatMessages.appendChild(responseContainer);

    // 滚动到底部
    scrollToBottom();

    return responseContainer;
  }

  // 处理流式响应的每个数据块
  function handleStreamChunk(chunk, responseId) {
    const responseElement = document.getElementById(responseId);

    if (!responseElement) return;

    try {
      // 从chunk中提取文本内容
      if (chunk.choices && chunk.choices.length > 0) {
        const delta = chunk.choices[0].delta;
        if (delta && delta.content) {
          // 追加新内容
          responseElement.textContent += delta.content;
          // 滚动到底部
          scrollToBottom();
        }
      }
    } catch (error) {
      console.error('处理流式响应块时出错:', error);
    }
  }

  // 切换按钮状态（发送/停止）
  function toggleButtonState(showSend) {
    if (showSend) {
      // 显示发送按钮，隐藏停止按钮
      sendButton.style.display = 'block';
      stopButton.style.display = 'none';
      // 启用输入框
      messageInput.disabled = false;
      messageInput.classList.remove('disabled');
    } else {
      // 隐藏发送按钮，显示停止按钮
      sendButton.style.display = 'none';
      stopButton.style.display = 'block';
      // 禁用输入框
      messageInput.disabled = true;
      messageInput.classList.add('disabled');
    }
  }

  // 滚动到底部
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showErrorMessage(errorText) {
    const errorContainer = document.createElement('div');
    errorContainer.classList.add('message-container', 'received');

    const errorMessage = document.createElement('div');
    errorMessage.classList.add('message', 'received', 'error');

    // 确保 errorText 是字符串
    const errorString = typeof errorText === 'string'
      ? errorText
      : (errorText instanceof Error ? errorText.message : JSON.stringify(errorText));

    errorMessage.textContent = `错误: ${errorString}`;

    // 安全检查：只有当 errorString 是字符串时才调用 includes
    if (typeof errorString === 'string' && errorString.includes('API密钥')) {
      // 添加设置链接
      const settingsLink = document.createElement('a');
      settingsLink.href = '#';
      settingsLink.textContent = '点击这里设置API密钥';
      settingsLink.addEventListener('click', openOptionsPage);
      errorMessage.appendChild(document.createElement('br'));
      errorMessage.appendChild(settingsLink);
    }

    errorContainer.appendChild(errorMessage);
    chatMessages.appendChild(errorContainer);

    // 滚动到底部
    scrollToBottom();
  }

  function checkApiKeyStatus() {
    DeepSeek.isConfigured().then(configured => {
      if (!configured) {
        // 显示API密钥未设置的提示
        const welcomeContainer = document.createElement('div');
        welcomeContainer.classList.add('message-container', 'received');

        const welcomeMessage = document.createElement('div');
        welcomeMessage.classList.add('message', 'received', 'welcome');
        welcomeMessage.innerHTML = '欢迎使用AISider！<br>您需要先设置DeepSeek API密钥才能开始使用。';

        const settingsLink = document.createElement('a');
        settingsLink.href = '#';
        settingsLink.textContent = '点击这里设置API密钥';
        settingsLink.addEventListener('click', openOptionsPage);

        welcomeMessage.appendChild(document.createElement('br'));
        welcomeMessage.appendChild(settingsLink);
        welcomeContainer.appendChild(welcomeMessage);

        // 清除默认的欢迎消息
        chatMessages.innerHTML = '';
        chatMessages.appendChild(welcomeContainer);
      }
    });
  }

  // 打开选项页面（弹窗形式）
  function openOptionsPage() {
    DeepSeek.openSettings();
  }

  // 添加设置按钮到界面
  function addSettingsButton() {
    const chatHeader = document.querySelector('.chat-header');

    // 创建设置按钮
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.innerHTML = '⚙️';
    settingsButton.title = '设置';
    settingsButton.addEventListener('click', openOptionsPage);

    // 添加到头部
    if (chatHeader) {
      chatHeader.appendChild(settingsButton);
    }
  }

  // 添加设置按钮
  addSettingsButton();

  // 添加发送按钮点击事件
  sendButton.addEventListener('click', sendMessage);

  // 添加停止按钮点击事件
  stopButton.addEventListener('click', stopStreaming);

  // 添加输入框回车键事件
  messageInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault(); // 防止换行
      sendMessage();
    }
  });
});