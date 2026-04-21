// ① 从当前网址提取参数
function getUrlParams() {
  const hash = window.location.hash; // 获取 # 后面的内容
  const queryString = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(queryString);

  return {
    sdbh: params.get("sdbh"),
    qdbh: params.get("qdbh"),
    sdsin: params.get("sdsin")
  };
}

// ② 调用API获取文书列表
async function fetchDocList(params) {
  const API_URL = "https://zxfw.court.gov.cn/yzw/yzw-zxfw-sdfw/api/v1/sdfw/getWsListBySdbhNew";

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    credentials: "include", // 自动带上登录cookie
    body: JSON.stringify({
      sdbh: params.sdbh,
      qdbh: params.qdbh,
      sdsin: params.sdsin,
      pageNum: 1,
      pageSize: 100 // 尽量多获取
    })
  });

  if (!response.ok) throw new Error(`请求失败: ${response.status}`);
  return await response.json();
}

// ③ 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // 检查是否在正确页面
  if (request.action === "checkPage") {
    const params = getUrlParams();
    const isValid = !!(params.sdbh || params.qdbh);
    sendResponse({ isValid, params });
  }

  // 获取文书列表
  if (request.action === "getDocList") {
    const params = getUrlParams();

    fetchDocList(params)
      .then(data => {
        console.log("API返回数据:", data); // 调试用
        sendResponse({ success: true, data, params });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });

    return true; // 必须有这行，保持消息通道
  }
});
