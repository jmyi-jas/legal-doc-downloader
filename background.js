// 处理文件下载任务
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === "downloadFile") {
    chrome.downloads.download({
      url: request.url,
      filename: `法律文书/${cleanFilename(request.filename)}`,
      saveAs: false // false = 自动保存不弹窗
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });

    return true;
  }
});

function cleanFilename(name) {
  // 清理文件名中的非法字符
  return name.replace(/[\\/:*?"<>|]/g, "_") + ".pdf";
}
