/**
 * openWindow工具 - 用于打开URL
 * 
 * 该工具可以作为function call被DeepSeek调用，用于打开指定的URL
 */

/**
 * 打开一个新窗口或标签页，加载指定URL
 * @param {string} url - 要打开的URL
 * @param {Object} options - 打开窗口的选项
 * @param {boolean} options.newTab - 是否在新标签页打开，默认为true
 * @param {number} options.width - 窗口宽度，仅在newTab为false时有效
 * @param {number} options.height - 窗口高度，仅在newTab为false时有效
 * @returns {Promise<boolean>} - 是否成功打开
 */
export default async function openWindow(url, options = {}) {
  try {
    // 验证URL
    if (!url) {
      console.error('URL不能为空');
      return false;
    }

    // 确保URL格式正确
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // 默认选项
    const defaultOptions = {
      newTab: true,
      width: 800,
      height: 600
    };

    // 合并选项
    const finalOptions = { ...defaultOptions, ...options };

    if (finalOptions.newTab) {
      // 在新标签页中打开
      await chrome.tabs.create({ url });
    } else {
      // 在新窗口中打开
      await chrome.windows.create({
        url,
        width: finalOptions.width,
        height: finalOptions.height,
        type: 'popup'
      });
    }

    return true;
  } catch (error) {
    console.error('打开窗口失败:', error);
    return false;
  }
}

/**
 * 工具定义，用于注册到DeepSeek
 */
export const toolDefinition = {
  name: "openWindow",
  description: "打开一个URL链接，可以在新标签页或新窗口中打开",
  type: "function",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "要打开的URL地址，如果不包含http://或https://前缀，将自动添加https://"
      },
      newTab: {
        type: "boolean",
        description: "是否在新标签页打开，默认为true。如果设为false，则在新窗口中打开"
      },
      width: {
        type: "number",
        description: "窗口宽度，仅在newTab为false时有效"
      },
      height: {
        type: "number",
        description: "窗口高度，仅在newTab为false时有效"
      }
    },
    required: ["url"]
  }
}; 