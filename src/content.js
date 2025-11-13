document.addEventListener("DOMContentLoaded", function () {
  // 在这里编写与网页DOM交互的代码
  console.log("内容脚本已注入到网页中");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "runPmsApprove") {
    import(chrome.runtime.getURL("tools/pmsApprove.js")).then((module) => {
      module.default();
    });
  } else if (request.action === "runPmsApproval") {
    import(chrome.runtime.getURL("tools/pmsApproval.js")).then((module) => {
      module.default();
    });
  }
});
