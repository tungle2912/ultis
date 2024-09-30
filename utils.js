import axios from "axios";
import fs from "fs";

async function getApiURL() {
  try {
    // Đọc khóa từ file api_key.txt
    const apiKey = await fs.promises.readFile("key.txt", "utf8");
    // Xây dựng URL với khóa
    const apiURL = `http://vip.vinaproxy.net/api/getip/key=${apiKey.trim()}`;
    return apiURL; // Trả về URL
  } catch (error) {
    console.error("Error reading API key:", error);
    throw error; // Ném lỗi để xử lý sau
  }
}
export async function getIPData() {
  try {
    const apiURL = await getApiURL();
    const response = await fetch(apiURL);
    const data = await response.json();

    const ip = data.data.ip;
    const port = data.data.port;
    const username = data.data.username || "kkk";
    const password = data.data.password || "kkk";

    const logData = `${ip}:${port}:${username}:${password}\n`;

    // Ghi dữ liệu vào file 'ip_logs.txt'
    fs.appendFile("ip_logs.txt", logData, (err) => {
      if (err) throw err;
      console.log("Logged:", logData.trim());
    });
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}
export function removeDuplicateProxies() {
  fs.readFile("ip_logs.txt", "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        console.log("File không tồn tại. Không cần loại bỏ trùng lặp.");
        return;
      }
      throw err;
    }
    if (!data.trim()) {
      console.log("File rỗng. Không cần loại bỏ trùng lặp.");
      return;
    }

    // Tách từng dòng ra
    const lines = data.split("\n").filter((line) => line.trim() !== "");

    // Tạo một đối tượng để lưu trữ các proxy theo IP
    const uniqueProxies = {};

    lines.forEach((line) => {
      const [ip, port, username, password] = line.split(":");

      // Nếu IP đã tồn tại trong uniqueProxies
      if (uniqueProxies[ip]) {
        // Nếu đã tồn tại, xóa proxy cũ
        delete uniqueProxies[ip]; // Xóa dòng cũ
      }
      // Thêm proxy mới vào
      uniqueProxies[ip] = line; // Lưu giữ proxy mới
    });

    // Ghi lại các proxy không trùng lặp vào file
    const filteredProxies = Object.values(uniqueProxies).join("\n") + "\n";
    fs.writeFile("ip_logs.txt", filteredProxies, (err) => {
      if (err) throw err;
      console.log("Duplicates removed and file updated.");
    });
  });
}
async function checkProxy(ip, port, username, password) {
  try {
    const res = await axios.get("http://api.myip.com", {
      proxy: {
        host: ip,
        port: +port,
        auth: {
          username,
          password,
        },
      },
      timeout: 5000,
    });
    return { ip, port, status: "success", response: res.data };
  } catch (error) {
    return { ip, port, status: "fail", error: error.message };
  }
}
export async function checkAllProxies() {
  try {
    const data = await fs.promises.readFile("ip_logs.txt", "utf8");
    const lines = data.split("\n").filter((line) => line.trim() !== "");

    const workingProxies = [];
    const nonWorkingProxies = [];

    for (const line of lines) {
      const [ip, port, username, password] = line.split(":");
      const result = await checkProxy(ip, port, username, password);

      if (result.status === "success") {
        workingProxies.push(
          `${result.ip}:${result.port}:${username}:${password}`
        );
      } else {
        nonWorkingProxies.push(
          `${result.ip}:${result.port}:${username}:${password}`
        );
      }
    }

    // Ghi các proxy hoạt động vào file 'working_proxies.txt'
    await fs.promises.writeFile(
      "working_proxies.txt",
      workingProxies.join("\n")
    );
    console.log("Working proxies have been saved to working_proxies.txt.");

    // Ghi các proxy không hoạt động vào file 'non_working_proxies.txt'
    await fs.promises.writeFile(
      "non_working_proxies.txt",
      nonWorkingProxies.join("\n")
    );
    console.log(
      "Non-working proxies have been saved to non_working_proxies.txt."
    );
  } catch (error) {
    console.error("Error reading file or checking proxies:", error);
  }
}

async function isProxyChecked(ip, port) {
  try {
    const data = await fs.promises.readFile("checked_status.txt", "utf8");
    const lines = data.split("\n").filter((line) => line.trim() !== "");
    return lines.some((line) => line.includes(`${ip}:checked`));
  } catch (error) {
    if (error.code === "ENOENT") {
      // Nếu file chưa tồn tại thì proxy chưa được kiểm tra
      return false;
    } else {
      throw error;
    }
  }
}

// Hàm đánh dấu proxy là đã kiểm tra
async function markProxyChecked(ip) {
  const logData = `${ip}:checked\n`;
  await fs.promises.appendFile("checked_status.txt", logData);
}

export async function checkProxiesInPortRange() {
  try {
    const data = await fs.promises.readFile("working_proxies.txt", "utf8");
    const lines = data.split("\n").filter((line) => line.trim() !== "");

    const validProxies = [];

    // Mỗi proxy có thể chạy song song kiểm tra trên 150 cổng
    const allPromises = lines.map(async (line) => {
      const [ip, portStr, username, password] = line.split(":");
      const portBase = portStr.slice(0, -2); // Lấy tất cả nhưng 2 số cuối của port

      // Kiểm tra xem IP đã được kiểm tra hay chưa
      const alreadyChecked = await isProxyChecked(ip);
      if (!alreadyChecked) {
        // Tạo mảng các promises cho mỗi proxy với 150 cổng
        const proxyPromises = Array.from({ length: 150 }, async (_, i) => {
          const newPort = `${portBase}${i.toString().padStart(2, "0")}`; // Thay đổi 2 chữ số cuối
          const result = await checkProxy(ip, newPort, username, password);
          if (result.status === "success") {
            validProxies.push(
              `${result.ip}:${newPort}:${username}:${password}`
            );
          }
        });

        // Chạy song song kiểm tra cho 150 cổng
        await Promise.all(proxyPromises);

        // Đánh dấu IP này đã được kiểm tra sau khi kiểm tra xong tất cả các cổng
        await markProxyChecked(ip);
      }
    });

    // Đợi tất cả các proxy được kiểm tra
    await Promise.all(allPromises);

    // Ghi các proxy hoạt động vào file 'checked_proxies.txt'
    await fs.promises.appendFile("checked_proxies.txt", validProxies.join("\n"));
    console.log("Checked proxies have been saved to checked_proxies.txt.");
  } catch (error) {
    console.error("Error reading file or checking proxies:", error);
  }
}
