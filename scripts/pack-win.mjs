#!/usr/bin/env node
/**
 * 打包脚本：将应用打包为 Windows 便携版
 * 输出到 release/ 目录
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "release", "班级积分榜");

console.log("🔨 开始打包...\n");

// 1. 清理
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 2. 构建前端
console.log("📦 构建前端...");
execSync("npm run build", { cwd: root, stdio: "inherit" });

// 3. 编译 server
console.log("\n⚙️  编译服务端...");
execSync(
  "npx esbuild server/index.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist-server/server.cjs --external:better-sqlite3",
  { cwd: root, stdio: "inherit" }
);

// 4. 复制文件
console.log("\n📁 复制文件...");

// dist/ (前端)
copyDirSync(path.join(root, "dist"), path.join(outDir, "dist"));

// server.cjs
fs.copyFileSync(
  path.join(root, "dist-server", "server.cjs"),
  path.join(outDir, "server.cjs")
);

// package.json (只保留 dependencies 中的 better-sqlite3)
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const minPkg = {
  name: pkg.name,
  version: pkg.version,
  private: true,
  dependencies: {
    "better-sqlite3": pkg.dependencies["better-sqlite3"],
  },
};
fs.writeFileSync(
  path.join(outDir, "package.json"),
  JSON.stringify(minPkg, null, 2)
);

// 启动脚本
fs.copyFileSync(
  path.join(root, "scripts", "start.bat"),
  path.join(outDir, "启动积分榜.bat")
);

// 创建 data 目录
fs.mkdirSync(path.join(outDir, "data"), { recursive: true });

console.log("\n✅ 打包完成！");
console.log(`📂 输出目录: ${outDir}`);
console.log("\n使用方式:");
console.log("  1. 将 release/班级积分榜 文件夹复制到目标电脑");
console.log("  2. 确保目标电脑已安装 Node.js (https://nodejs.org)");
console.log('  3. 双击 "启动积分榜.bat"');
console.log("");

// ─── 工具函数 ───

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
