# 房价实验游戏

一个基于网页的单人模拟游戏，用于行为经济学研究，探究房价如何影响风险偏好和金融决策行为。

## 项目结构

```
HomePrice/
├── server/                 # 后端（Node.js + Express + SQLite）
│   ├── index.js           # Express 服务器入口
│   ├── config.js          # 集中式游戏配置参数
│   ├── db.js              # SQLite 数据库初始化与辅助函数
│   ├── routes.js          # RESTful API 路由处理
│   └── package.json       # Node.js 依赖配置
├── client/                # 前端（Phaser 3 + HTML/CSS）
│   ├── index.html         # 入口页面
│   ├── js/                # JavaScript 模块
│   │   ├── api.js         # API 通信模块
│   │   ├── main.js        # Phaser 游戏初始化
│   │   └── scenes/        # Phaser 场景文件
│   ├── css/               # 样式表
│   │   └── style.css      # 全局样式
│   └── assets/            # 游戏资源（图片等）
└── README.md
```

## 快速开始

### 环境要求

- **Node.js >= 18.x**（JavaScript 运行环境，必须安装）

  如果你还没有安装 Node.js，请按以下步骤操作：

  1. 访问 Node.js 官网：https://nodejs.org/
  2. 下载 **LTS（长期支持版）** 安装包（推荐，更稳定）
  3. 双击下载的安装包，一路点击 **Next / 下一步** 即可完成安装
  4. 安装完成后，打开 **终端**（Windows 搜索 "PowerShell" 或 "命令提示符"；Mac 打开 "终端"），输入以下命令验证是否安装成功：

  ```bash
  node -v
  ```

  如果显示类似 `v18.x.x` 或更高的版本号，说明安装成功。

### 安装与运行

1. **打开终端 / 命令行**

   - **Windows**：按 `Win + R`，输入 `powershell`，回车
   - **Mac**：按 `Cmd + Space`，搜索 "终端"，回车

2. **进入项目的 server 目录**

   使用 `cd` 命令切换到项目的 `server` 文件夹。例如，如果项目放在 `D:\2dgame\HomePrice`，则输入：

   ```bash
   cd D:\2dgame\HomePrice\server
   ```

   > 💡 提示：你也可以在文件管理器中打开 `server` 文件夹，然后在地址栏输入 `powershell` 回车，即可直接在该目录打开终端。

3. **安装依赖包**

   在终端中输入以下命令，然后回车，等待安装完成：

   ```bash
   npm install
   ```

   这条命令会自动下载项目所需的所有依赖库（Express、SQLite 等）。安装过程中会显示进度，请耐心等待。安装成功后，你会看到 `server` 目录下多出一个 `node_modules` 文件夹。

   > ⚠️ 如果下载速度很慢，可以先切换为国内镜像源，再重新安装：
   >
   > ```bash
   > npm config set registry https://registry.npmmirror.com
   > npm install
   > ```

4. **启动服务器**

   依赖安装完成后，在同一终端中输入：

   ```bash
   npm start
   ```

   看到类似 `Server running on port 3000` 的提示，说明服务器已成功启动。

   > ⚠️ 启动后请 **不要关闭** 这个终端窗口，否则服务器会停止运行。

5. **打开浏览器访问游戏**

   打开浏览器（推荐 Chrome），在地址栏输入：

   ```
   http://localhost:3000/?uid=TEST001
   ```

   回车后即可进入游戏页面。

   > 💡 `uid=TEST001` 是参与者的唯一标识，每位实验参与者应使用不同的 uid（如 `uid=P001`、`uid=P002`）。

### 配置说明

所有游戏参数（工资、房价、彩票设置等）均可在 `server/config.js` 中调整，无需修改游戏逻辑代码。

### 数据导出

将所有参与者数据导出为 CSV 文件：

```
http://localhost:3000/api/export?password=research2026
```

## 技术栈

- **前端**：Phaser 3（游戏引擎）+ HTML/CSS（表单界面）
- **后端**：Node.js + Express
- **数据库**：SQLite（通过 better-sqlite3）
