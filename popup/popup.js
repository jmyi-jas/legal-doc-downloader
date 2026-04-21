let docList = [];

document.addEventListener("DOMContentLoaded", async () => {

  const statusBar      = document.getElementById("statusBar");
  const docArea        = document.getElementById("docArea");
  const progressArea   = document.getElementById("progressArea");
  const doneArea       = document.getElementById("doneArea");
  const downloadAllBtn = document.getElementById("downloadAllBtn");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.includes("zxfw.court.gov.cn")) {
    statusBar.className = "status-error";
    statusBar.innerHTML = `❌ 请先打开文书页面<br><small>网址需包含 zxfw.court.gov.cn</small>`;
    return;
  }

  statusBar.innerHTML = "⏳ 正在获取文书列表...";
  statusBar.className = "status-loading";

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fetchDocsFromPage,
    });

    const result = results[0].result;

    if (!result.success) {
      statusBar.className = "status-error";
      statusBar.innerHTML = `❌ 获取失败：${result.error}`;
      return;
    }

    docList = parseDocList(result.data);

    if (docList.length === 0) {
      statusBar.className = "status-error";
      statusBar.innerHTML = `⚠️ 未找到文书`;
      return;
    }

    statusBar.className = "status-ok";
    statusBar.innerHTML = "✅ 获取成功";
    docArea.classList.remove("hidden");
    document.getElementById("docCount").textContent = docList.length;
    renderDocList(docList);

  } catch (err) {
    statusBar.className = "status-error";
    statusBar.innerHTML = `❌ ${err.message}`;
  }

  downloadAllBtn.addEventListener("click", () => downloadAll());
});


// ✅ 注入到网页执行（修正版）
async function fetchDocsFromPage() {
  try {
    const hash = window.location.hash;
    const queryString = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(queryString);

    const response = await fetch(
      "https://zxfw.court.gov.cn/yzw/yzw-zxfw-sdfw/api/v1/sdfw/getWsListBySdbhNew",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sdbh:  params.get("sdbh"),
          qdbh:  params.get("qdbh"),
          sdsin: params.get("sdsin"),
          pageNum: 1,
          pageSize: 100
        })
      }
    );

    const data = await response.json();

    if (data.code === 200 && Array.isArray(data.data)) {
      return { success: true, data };
    } else {
      return { success: false, error: data.msg || "API返回格式错误" };
    }

  } catch (err) {
    return { success: false, error: err.message };
  }
}


// ✅ 解析文书列表（修正字段名）
function parseDocList(data) {
  const list = Array.isArray(data?.data) ? data.data : [];
  console.log("原始列表数据:", list);

  return list.map((item, index) => ({
    id:   item.wsid   || index,
    name: item.c_wsmc || `未命名文件_${index + 1}`,
    ext:  item.c_wjgs || "pdf",
    url:  item.wjlj   || null,
    date: item.fwsj   || item.createTime || ""
  }));
}


// ✅ 渲染列表（含扩展名）
function renderDocList(list) {
  const container = document.getElementById("docList");
  container.innerHTML = list.map(doc => `
    <div class="doc-item">
      <span class="doc-icon">📄</span>
      <div class="doc-info">
        <div class="doc-name">${doc.name}.${doc.ext}</div>
        <div class="doc-date">${doc.date}</div>
      </div>
      <span class="doc-status" id="status_${doc.id}">待下载</span>
    </div>
  `).join("");
}


// ✅ 下载全部
async function downloadAll() {
  const progressArea   = document.getElementById("progressArea");
  const doneArea       = document.getElementById("doneArea");
  const progressText   = document.getElementById("progressText");
  const progressFill   = document.getElementById("progressFill");
  const progressDetail = document.getElementById("progressDetail");
  const btn            = document.getElementById("downloadAllBtn");

  btn.disabled = true;
  progressArea.classList.remove("hidden");

  let successCount = 0;
  const total = docList.length;

  for (let i = 0; i < docList.length; i++) {
    const doc = docList[i];
    const statusEl = document.getElementById(`status_${doc.id}`);
    const fullName = `${doc.name}.${doc.ext}`;  // ✅ 完整文件名

    progressText.textContent = `下载中 ${i + 1} / ${total}`;
    progressFill.style.width = `${((i + 1) / total) * 100}%`;
    progressDetail.textContent = fullName;
    if (statusEl) statusEl.textContent = "⏳";

    try {
      const url = doc.url || buildDownloadUrl(doc.id);
      await triggerDownload(url, fullName);

      if (statusEl) { statusEl.textContent = "✅"; statusEl.style.color = "green"; }
      successCount++;
    } catch (e) {
      if (statusEl) { statusEl.textContent = "❌"; statusEl.style.color = "red"; }
      console.error(fullName, e);
    }

    await sleep(800);
  }

  progressArea.classList.add("hidden");
  doneArea.classList.remove("hidden");
  document.querySelector("#doneArea .done-icon").textContent =
    successCount === total ? "✅" : "⚠️";
  document.querySelector("#doneArea div:nth-child(2)").textContent =
    `完成！成功 ${successCount} / ${total} 份`;
}


function buildDownloadUrl(wsid) {
  return `https://zxfw.court.gov.cn/yzw/yzw-zxfw-sdfw/api/v1/sdfw/downloadWs?wsid=${wsid}`;
}

function triggerDownload(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "downloadFile", url, filename },
      (res) => {
        if (res?.success) resolve();
        else reject(new Error(res?.error || "下载失败"));
      }
    );
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
