// 该文件是扩展的后台脚本，负责处理扩展的生命周期事件和长时间运行的任务。

import * as DeepSeek from './services/deepseek/index.js';

// 获取API密钥的函数
async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['apiKey'], function (result) {
            resolve(result.apiKey || '');
        });
    });
}

// 获取模型设置的函数
async function getModel() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['model'], function (result) {
            resolve(result.model || 'deepseek-reasoner'); // 默认使用deepseek-reasoner
        });
    });
}

chrome.runtime.onInstalled.addListener(() => {
    console.log("扩展已安装");

    // 检查API密钥是否已设置，如果未设置则打开选项页面
    DeepSeek.isConfigured().then(configured => {
        if (!configured) {
            // 使用 chrome.runtime.openOptionsPage() 打开弹窗选项页面
            chrome.runtime.openOptionsPage();
        }
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log("扩展已启动");
});

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('收到消息：', request);

    // 处理直接消息请求
    if (request.message) {
        // 使用 DeepSeek 服务发送消息
        const systemMessage = "You are a helpful assistant.";

        // 如果请求是流式的
        if (request.stream) {
            // 创建一个累积响应的对象
            let accumulatedResponse = {
                status: 'streaming',
                data: {
                    choices: [{
                        message: {
                            content: ''
                        }
                    }]
                }
            };

            // 发送初始响应
            sendResponse(accumulatedResponse);

            // 处理每个流式响应块
            const handleChunk = (chunk) => {
                try {
                    if (chunk.choices && chunk.choices.length > 0) {
                        const delta = chunk.choices[0].delta;
                        if (delta && delta.content) {
                            // 累积响应内容
                            accumulatedResponse.data.choices[0].message.content += delta.content;

                            // 发送更新
                            chrome.runtime.sendMessage({
                                type: 'stream_update',
                                data: {
                                    chunk: delta.content,
                                    messageId: request.messageId
                                }
                            }).catch(err => console.error('发送流更新失败:', err));
                        }
                    }
                } catch (error) {
                    console.error('处理流式响应块时出错:', error);
                }
            };

            // 使用流式请求
            DeepSeek.chatStream(request.message, handleChunk, systemMessage)
                .then(() => {
                    // 流式请求完成后，发送完成消息
                    chrome.runtime.sendMessage({
                        type: 'stream_complete',
                        data: {
                            messageId: request.messageId
                        }
                    }).catch(err => console.error('发送流完成消息失败:', err));
                })
                .catch(error => {
                    console.error('Error:', error);
                    // 发送错误消息
                    chrome.runtime.sendMessage({
                        type: 'stream_error',
                        data: {
                            error: error instanceof Error ? error.message : String(error),
                            messageId: request.messageId
                        }
                    }).catch(err => console.error('发送流错误消息失败:', err));
                });

            // 返回 true 表示将使用 sendResponse 异步响应
            return true;
        } else {
            // 非流式请求，使用普通的 chat 方法
            DeepSeek.chat(request.message, systemMessage)
                .then(data => {
                    console.log('Success:', data);
                    sendResponse({ status: 'success', data: data });
                })
                .catch(error => {
                    console.error('Error:', error);
                    // 确保错误是可序列化的字符串
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    sendResponse({
                        status: 'error',
                        error: errorMessage
                    });
                });

            // 返回 true 表示将 sendResponse 保持为异步
            return true;
        }
    }
});

// 其他后台任务可以在这里添加。