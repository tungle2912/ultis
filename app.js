import {
  checkAllProxies,
  checkProxiesInPortRange,
  getIPData,
  removeDuplicateProxies,
} from "./utils.js";

// Hàm thực hiện tất cả các công việc
async function executeTasks() {
  try {
    await removeDuplicateProxies(); // Loại bỏ proxy trùng lặp
    await checkAllProxies(); // Kiểm tra tất cả proxy
    await checkProxiesInPortRange()
  } catch (error) {
    console.error("Error during execution:", error);
  }
}

// Hàm logTwice để ghi nhận dữ liệu IP hai lần liên tiếp
async function logTwice() {
  await getIPData(); // Gọi hàm getIPData để lấy dữ liệu IP và ghi vào file 'ip_logs.txt'
  setTimeout(async () => {
    await getIPData(); // Gọi hàm getIPData lần thứ hai sau 1 giây
  }, 1000);
}
await logTwice();
// Khởi động ngay lập tức
await executeTasks();

// Thiết lập interval cho các tác vụ
setInterval(executeTasks, 5 * 60 * 1000); // Gọi executeTasks mỗi 5 phút

// Thiết lập interval cho logTwice
setInterval(logTwice, 63000); // Ghi nhận dữ liệu IP mỗi 63 giây

setInterval(checkProxiesInPortRange, 10 * 60 * 1000); 
