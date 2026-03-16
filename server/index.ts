import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import * as db from "./db";

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30天

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));

// ─── 访问密码保护 ───

function generateToken(password: string): string {
  return crypto.createHash("sha256").update(`scoreboard:${password}`).digest("hex").slice(0, 32);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((c) => {
    const [key, ...rest] = c.trim().split("=");
    if (key) cookies[key] = rest.join("=");
  });
  return cookies;
}

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>班级积分榜 - 访问验证</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #e0f2fe, #f0fdf4);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .card {
      background: #fff; border-radius: 20px; padding: 48px 40px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.08); text-align: center;
      max-width: 380px; width: 90%;
    }
    .icon { font-size: 3rem; margin-bottom: 12px; }
    h1 { font-size: 1.4rem; color: #1e293b; margin-bottom: 6px; }
    .sub { font-size: 0.9rem; color: #94a3b8; margin-bottom: 24px; }
    input {
      width: 100%; padding: 14px 16px; border: 2px solid #e2e8f0;
      border-radius: 12px; font-size: 1.1rem; text-align: center;
      letter-spacing: 4px; outline: none; transition: border-color 0.2s;
    }
    input:focus { border-color: #0d9488; }
    button {
      width: 100%; padding: 14px; margin-top: 16px; border: none;
      border-radius: 12px; background: linear-gradient(135deg, #0d9488, #0f766e);
      color: #fff; font-size: 1.1rem; font-weight: 600; cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    button:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(13,148,136,0.3); }
    button:active { transform: translateY(0); }
    .error { color: #dc2626; font-size: 0.9rem; margin-top: 12px; display: none; }
    .error.show { display: block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>班级积分榜</h1>
    <p class="sub">请输入访问密码</p>
    <form method="POST" action="/__auth">
      <input type="password" name="password" placeholder="输入密码" autofocus required />
      <button type="submit">进入系统</button>
    </form>
    <p class="error __ERR__">密码错误，请重试</p>
  </div>
</body>
</html>`;

if (ACCESS_PASSWORD) {
  const validToken = generateToken(ACCESS_PASSWORD);

  // 认证中间件（包含登录处理）
  app.use((req, res, next) => {
    // 处理登录提交
    if (req.path === "/__auth" && req.method === "POST") {
      const password = req.body?.password;
      if (password === ACCESS_PASSWORD) {
        res.setHeader(
          "Set-Cookie",
          `sb_token=${validToken}; Path=/; Max-Age=${COOKIE_MAX_AGE / 1000}; HttpOnly; SameSite=Lax`
        );
        res.redirect("/");
      } else {
        res.status(401).send(LOGIN_PAGE.replace('__ERR__"', '__ERR__ show"'));
      }
      return;
    }

    // 检查 cookie
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.sb_token === validToken) return next();

    // 未认证 → API 返回 401，页面返回登录表单
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "未授权访问" });
    }
    res.send(LOGIN_PAGE.replace(' __ERR__"', '"'));
  });

  console.log("[server] 🔒 访问密码保护已启用");
}

// ─── API 路由 ───

// 获取全量数据
app.get("/api/data", (_req, res) => {
  try {
    const data = db.getAllData();
    res.json(data);
  } catch (err) {
    console.error("[GET /api/data]", err);
    res.status(500).json({ error: "获取数据失败" });
  }
});

// 导出全量 JSON
app.get("/api/data/export", (_req, res) => {
  try {
    const data = db.getAllData();
    res.setHeader("Content-Disposition", `attachment; filename="scoreboard-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(data);
  } catch (err) {
    console.error("[GET /api/data/export]", err);
    res.status(500).json({ error: "导出失败" });
  }
});

// 导入全量数据
app.post("/api/data/import", (req, res) => {
  try {
    const data = req.body;
    if (!data.groups || !data.students || !data.rules || !data.records) {
      return res.status(400).json({ error: "数据格式不正确" });
    }
    if (!data.settings) data.settings = { managePin: "1234" };
    db.importData(data);
    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/data/import]", err);
    res.status(500).json({ error: "导入失败" });
  }
});

// 重置为示例数据
app.post("/api/data/reset", (_req, res) => {
  try {
    db.resetToSeed();
    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/data/reset]", err);
    res.status(500).json({ error: "重置失败" });
  }
});

// ─── Students ───

app.post("/api/students", (req, res) => {
  try {
    const { id, name, groupId, sortOrder } = req.body;
    if (!id || !name || !groupId) {
      return res.status(400).json({ error: "缺少必要字段" });
    }
    db.addStudent(id, name, groupId, sortOrder || 0);
    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/students]", err);
    res.status(500).json({ error: "添加学生失败" });
  }
});

app.put("/api/students/:id", (req, res) => {
  try {
    const { name, groupId } = req.body;
    db.updateStudent(req.params.id, name, groupId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/students/:id]", err);
    res.status(500).json({ error: "更新学生失败" });
  }
});

app.delete("/api/students/:id", (req, res) => {
  try {
    db.deleteStudent(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/students/:id]", err);
    res.status(500).json({ error: "删除学生失败" });
  }
});

app.patch("/api/students/:id/toggle", (req, res) => {
  try {
    db.toggleStudent(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/students/:id/toggle]", err);
    res.status(500).json({ error: "切换学生状态失败" });
  }
});

// ─── Groups ───

app.post("/api/groups", (req, res) => {
  try {
    const { id, name, sortOrder } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: "缺少必要字段" });
    }
    db.addGroup(id, name, sortOrder || 0);
    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/groups]", err);
    res.status(500).json({ error: "添加小组失败" });
  }
});

app.put("/api/groups/:id", (req, res) => {
  try {
    const { name } = req.body;
    db.updateGroup(req.params.id, name);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/groups/:id]", err);
    res.status(500).json({ error: "更新小组失败" });
  }
});

app.delete("/api/groups/:id", (req, res) => {
  try {
    const count = db.getStudentsInGroup(req.params.id);
    if (count > 0) {
      return res.status(400).json({ error: `小组下还有 ${count} 名学生，请先移走` });
    }
    db.deleteGroup(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/groups/:id]", err);
    res.status(500).json({ error: "删除小组失败" });
  }
});

app.patch("/api/groups/:id/toggle", (req, res) => {
  try {
    db.toggleGroup(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/groups/:id/toggle]", err);
    res.status(500).json({ error: "切换小组状态失败" });
  }
});

// ─── Rules ───

app.post("/api/rules", (req, res) => {
  try {
    const { id, name, scoreDelta, sortOrder } = req.body;
    if (!id || !name || scoreDelta === undefined) {
      return res.status(400).json({ error: "缺少必要字段" });
    }
    db.addRule(id, name, scoreDelta, sortOrder || 0);
    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/rules]", err);
    res.status(500).json({ error: "添加规则失败" });
  }
});

app.put("/api/rules/:id", (req, res) => {
  try {
    const { name, scoreDelta } = req.body;
    db.updateRule(req.params.id, name, scoreDelta);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/rules/:id]", err);
    res.status(500).json({ error: "更新规则失败" });
  }
});

app.delete("/api/rules/:id", (req, res) => {
  try {
    db.deleteRule(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/rules/:id]", err);
    res.status(500).json({ error: "删除规则失败" });
  }
});

app.patch("/api/rules/:id/toggle", (req, res) => {
  try {
    db.toggleRule(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/rules/:id/toggle]", err);
    res.status(500).json({ error: "切换规则状态失败" });
  }
});

// ─── Records ───

app.post("/api/records", (req, res) => {
  try {
    const record = req.body;
    if (!record.id || !record.studentId || !record.ruleId) {
      return res.status(400).json({ error: "缺少必要字段" });
    }
    // 验证学生和规则存在且可用
    const student = db.getStudent(record.studentId);
    const rule = db.getRule(record.ruleId);
    if (!student || !student.active) {
      return res.status(400).json({ error: "学生不存在或已停用" });
    }
    if (!rule || !rule.enabled) {
      return res.status(400).json({ error: "规则不存在或已停用" });
    }
    db.addRecord(record);
    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/records]", err);
    res.status(500).json({ error: "添加记录失败" });
  }
});

app.post("/api/records/batch", (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "记录列表为空" });
    }
    db.addBatchRecords(records);
    res.json({ ok: true, count: records.length });
  } catch (err) {
    console.error("[POST /api/records/batch]", err);
    res.status(500).json({ error: "批量添加记录失败" });
  }
});

app.post("/api/records/undo-last", (_req, res) => {
  try {
    const result = db.undoLastRecord();
    if (!result.success) {
      return res.status(400).json({ error: "没有5分钟内可撤销的记录" });
    }
    res.json({ ok: true, id: result.id });
  } catch (err) {
    console.error("[POST /api/records/undo-last]", err);
    res.status(500).json({ error: "撤销失败" });
  }
});

app.patch("/api/records/:id/revoke", (req, res) => {
  try {
    const ok = db.revokeRecord(req.params.id);
    if (!ok) return res.status(400).json({ error: "撤回失败" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/records/:id/revoke]", err);
    res.status(500).json({ error: "撤回失败" });
  }
});

app.patch("/api/records/:id/restore", (req, res) => {
  try {
    const ok = db.restoreRecord(req.params.id);
    if (!ok) return res.status(400).json({ error: "恢复失败" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/records/:id/restore]", err);
    res.status(500).json({ error: "恢复失败" });
  }
});

// ─── Settings ───

app.put("/api/settings/pin", (req, res) => {
  try {
    const { pin } = req.body;
    const ok = db.updatePin(pin);
    if (!ok) return res.status(400).json({ error: "PIN 需为4-6位数字" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/settings/pin]", err);
    res.status(500).json({ error: "更新 PIN 失败" });
  }
});

// ─── 静态文件 + SPA Fallback ───

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ─── 启动 ───

app.listen(PORT, () => {
  console.log(`[server] 🚀 班级积分榜服务已启动: http://localhost:${PORT}`);
});
