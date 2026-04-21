const API_CONFIG = {
  BASE_URL: "https://zxfw.court.gov.cn/yzw/yzw-zxfw-sdfw/api/v1/sdfw",
  ENDPOINTS: {
    GET_LIST: "/getWsListBySdbhNew"
  }
};

/**
 * 根据案号获取文书列表
 * @param {string} sdbh - 案号(申动编号)
 * @param {object} options - 额外参数
 */
async function getWsListBySdbh(sdbh, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_LIST}`;
  
  const params = {
    sdbh: sdbh,
    pageNum: options.pageNum || 1,
    pageSize: options.pageSize || 10,
    ...options
  };

  try {
    const response = await fetch(url, {
      method: "POST",  // 需要根据实际接口确认
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        // 如需认证token，从页面cookie中获取
        ...getAuthHeaders()
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error("API请求失败:", error);
    throw error;
  }
}

/**
 * 获取认证头信息（复用当前登录状态）
 */
function getAuthHeaders() {
  // 插件运行在网站上下文中，会自动携带cookie
  // 如需额外token，从localStorage或cookie中读取
  const token = localStorage.getItem("token") || 
                getCookie("Authorization");
  
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}
