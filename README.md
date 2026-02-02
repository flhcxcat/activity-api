# Activity Status API

这是一个简单的 Vercel Serverless API，用于存储和检索当前应用状态。

## 部署步骤

### 1. 创建 Upstash Redis 数据库

1. 访问 [Upstash Console](https://console.upstash.com/)
2. 注册/登录账号
3. 创建一个新的 Redis 数据库（选择免费计划）
4. 在数据库详情页获取 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`

### 2. 部署到 Vercel

1. 在 GitHub 上创建一个新仓库，上传 `activity-api` 文件夹中的所有文件
2. 访问 [Vercel](https://vercel.com/)，导入该仓库
3. 在项目设置中添加环境变量：
   - `UPSTASH_REDIS_REST_URL`: 你的 Redis REST URL
   - `UPSTASH_REDIS_REST_TOKEN`: 你的 Redis REST Token
   - `API_SECRET`: 自定义一个密钥（用于上报时验证）
4. 部署完成后获取 API 地址

### 3. 配置博客

修改 `ProfileBar.astro` 中的 `ACTIVITY_API_URL` 为你的 Vercel API 地址：

```javascript
const ACTIVITY_API_URL = 'https://your-project.vercel.app/api/activity';
```

### 4. 运行本地客户端

修改 `activity-reporter.ps1` 中的配置：

```powershell
$API_URL = "https://your-project.vercel.app/api/activity"
$API_SECRET = "your-api-secret"
```

然后运行脚本开始上报当前应用状态。

## API 端点

### GET /api/activity
获取当前应用状态

响应：
```json
{
  "app": "VS Code",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

### POST /api/activity
上报当前应用状态

请求头：
- `Authorization`: Bearer your-api-secret

请求体：
```json
{
  "app": "VS Code"
}
```
