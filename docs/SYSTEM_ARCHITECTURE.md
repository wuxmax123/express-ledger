# 系统架构文档

## 1. 系统概述

本系统是一个物流运价管理平台，用于管理多个物流供应商的运价表，支持运价导入、审核、对比、历史版本管理等功能。

### 1.1 核心功能
- **运价导入**: 多步骤向导式Excel文件导入
- **审核流程**: 基于角色的批次审核机制
- **差异分析**: 新旧运价对比和变更通知生成
- **版本管理**: 运价表历史版本追踪
- **运价查询**: 多维度运价浏览和对比
- **供应商管理**: 物流供应商和渠道配置

### 1.2 用户角色
- **普通用户 (user)**: 导入运价、查看数据
- **审核员 (rate_supervisor)**: 审批运价批次
- **管理员 (admin)**: 全部权限，管理用户角色

## 2. 技术栈

### 2.1 前端技术
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **路由**: React Router v6
- **状态管理**: Zustand + TanStack Query
- **UI组件库**: 
  - Ant Design (表格、表单等复杂组件)
  - Shadcn/ui + Radix UI (基础组件)
- **样式**: Tailwind CSS
- **国际化**: i18next (支持中英文)
- **Excel处理**: XLSX (客户端解析)
- **PDF生成**: jsPDF

### 2.2 后端技术 (Lovable Cloud)
- **数据库**: PostgreSQL (Supabase)
- **认证**: Supabase Auth
- **API**: Supabase Client SDK
- **无服务器函数**: Edge Functions (Deno)
- **实时更新**: Supabase Realtime (可选)

## 3. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                         前端应用层                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 运价导入  │  │ 审核中心  │  │ 差异分析  │  │ 历史版本  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 运价查询  │  │ 运价对比  │  │ 供应商管理│                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      API & 业务逻辑层                         │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │  Supabase Client │      │  Edge Functions  │            │
│  │  - CRUD 操作      │      │  - approve-batch │            │
│  │  - 实时订阅       │      │  (审核批次)       │            │
│  │  - 认证管理       │      │                  │            │
│  └──────────────────┘      └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      数据持久层                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PostgreSQL 数据库                         │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌───────────────┐ │  │
│  │  │  vendors   │  │  shipping_  │  │vendor_batches │ │  │
│  │  │  (供应商)   │  │  channels   │  │  (批次)        │ │  │
│  │  └────────────┘  │  (渠道)      │  └───────────────┘ │  │
│  │                  └─────────────┘                      │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │channel_rate_│  │channel_rate_ │  │ user_roles  │ │  │
│  │  │sheets       │  │items         │  │ (用户角色)   │ │  │
│  │  │(运价表版本)  │  │(运价明细)     │  └─────────────┘ │  │
│  │  └─────────────┘  └──────────────┘                   │  │
│  │                                                        │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │          Row-Level Security (RLS)                │ │  │
│  │  │  - 基于用户角色的数据访问控制                      │ │  │
│  │  │  - 使用 has_role() 函数避免递归                   │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 4. 数据模型

### 4.1 核心表结构

#### vendors (供应商表)
```sql
- id: integer (PK)
- code: varchar (供应商代码)
- name: varchar (供应商名称)
- contact_info: text (联系信息)
- created_at, updated_at: timestamp
```

#### shipping_channels (物流渠道表)
```sql
- id: integer (PK)
- vendor_id: integer (FK -> vendors)
- channel_code: varchar (渠道代码)
- name: varchar (渠道名称)
- service_type: varchar (服务类型)
- region: varchar (地区)
- currency: varchar (币种, 默认USD)
- created_at, updated_at: timestamp
```

#### vendor_batches (运价批次表)
```sql
- id: integer (PK)
- vendor_id: integer (FK -> vendors)
- file_name: varchar (文件名)
- effective_date: date (生效日期)
- approval_status: enum (pending/approved/rejected)
- total_channels: integer (渠道数量)
- uploaded_by: uuid (上传人)
- uploaded_at: timestamp
- approved_by: uuid (审核人)
- approved_at: timestamp
- rejection_reason: text (拒绝原因)
- notes: text (备注)
```

#### channel_rate_sheets (渠道运价表版本)
```sql
- id: integer (PK)
- batch_id: integer (FK -> vendor_batches)
- channel_id: integer (FK -> shipping_channels)
- version_code: varchar (版本号)
- file_name: varchar (文件名)
- effective_date: date (生效日期)
- approval_status: enum (pending/approved/rejected)
- status: varchar (active/inactive)
- uploaded_by: uuid
- approved_by: uuid
- approved_at: timestamp
- rejection_reason: text
- created_at, updated_at: timestamp
```

#### channel_rate_items (运价明细表)
```sql
- id: integer (PK)
- sheet_id: integer (FK -> channel_rate_sheets)
- country: varchar (国家)
- zone: varchar (区域)
- weight_from: numeric (起始重量)
- weight_to: numeric (结束重量)
- price: numeric (价格)
- currency: varchar (币种)
- eta: varchar (预计时效)
- created_at: timestamp
```

#### user_roles (用户角色表)
```sql
- id: uuid (PK)
- user_id: uuid (关联auth.users)
- role: enum (admin/rate_supervisor/user)
- created_at: timestamp
```

### 4.2 数据关系
```
vendors (1) ────→ (*) shipping_channels
vendors (1) ────→ (*) vendor_batches
vendor_batches (1) ────→ (*) channel_rate_sheets
shipping_channels (1) ────→ (*) channel_rate_sheets
channel_rate_sheets (1) ────→ (*) channel_rate_items
```

## 5. 安全架构

### 5.1 认证机制
- 使用 Supabase Auth 提供的 JWT 认证
- 支持邮箱密码登录和注册
- Session 持久化到 localStorage
- 自动刷新 Token

### 5.2 授权机制 (RLS)

#### 设计原则
- **绝对禁止**: 将角色存储在 profiles 或 users 表
- **必须**: 使用独立的 user_roles 表
- **原因**: 防止权限提升攻击

#### has_role() 函数
```sql
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

#### RLS 策略示例

**vendor_batches 表**:
- SELECT: 所有认证用户可查看
- INSERT: 所有认证用户可创建
- UPDATE: 仅 rate_supervisor 和 admin 可审批

**channel_rate_sheets 表**:
- SELECT: 所有认证用户可查看
- INSERT: 所有认证用户可创建
- UPDATE: 仅 rate_supervisor 和 admin 可审批

**user_roles 表**:
- SELECT: 仅查看自己的角色 或 admin
- INSERT/UPDATE/DELETE: 仅 admin

### 5.3 Edge Function 安全
- 使用 Supabase Auth 验证请求
- 通过 has_role() 函数检查权限
- 返回明确的错误信息 (403 Insufficient permissions)

## 6. 核心业务流程

### 6.1 运价导入流程

```
┌──────────────┐
│  上传Excel    │
│  (Step 1)    │
└──────┬───────┘
       ↓
┌──────────────┐
│  解析预览     │ ← 客户端使用 XLSX 库解析
│  (Step 2)    │   检测多个 Sheet
└──────┬───────┘
       ↓
┌──────────────┐
│  结构验证     │ ← 与历史数据对比
│  (Step 3)    │   判断: NONE/MINOR/MAJOR
└──────┬───────┘
       ↓
┌──────────────┐
│  确认操作     │ ← 如果是 MAJOR 变更
│  (Step 4)    │   用户确认合并/替换策略
└──────┬───────┘
       ↓
┌──────────────┐
│  导入进度     │ ← 上传到后端
│  (Step 5)    │   创建 batch 和 sheets
│              │   状态: pending
└──────────────┘
```

### 6.2 审核流程

```
┌────────────────┐
│  审核员查看     │ ← GET /api/batches?status=pending
│  待审批批次     │
└────────┬───────┘
         ↓
    ┌────┴────┐
    │  批准?   │
    └─┬─────┬─┘
      │     │
   [是]   [否]
      │     │
      ↓     ↓
┌─────────┐ ┌──────────────┐
│ 批准批次 │ │ 拒绝并输入   │
│         │ │ 拒绝原因      │
└────┬────┘ └──────┬───────┘
     │             │
     └──────┬──────┘
            ↓
   ┌────────────────┐
   │ Edge Function  │ ← approve-batch
   │ 1. 验证权限     │
   │ 2. 更新状态     │
   │ 3. 记录审核信息 │
   └────────────────┘
```

### 6.3 差异分析流程

```
┌──────────────┐
│  选择对比条件  │
│  - 供应商     │
│  - 渠道       │
│  - 日期范围   │
└──────┬───────┘
       ↓
┌──────────────┐
│  查询运价变化  │ ← 对比相邻版本
│  计算差异      │   price_new - price_old
└──────┬───────┘
       ↓
┌──────────────┐
│  展示差异列表  │
│  - 增加项 (+)  │
│  - 减少项 (-)  │
│  - 变更百分比  │
└──────┬───────┘
       ↓
┌──────────────┐
│  生成通知      │ ← 中英文双语
│  - 复制到剪贴板│   模板生成
│  - 导出 PDF    │
└──────────────┘
```

## 7. 前端架构

### 7.1 目录结构
```
src/
├── components/
│   ├── auth/              # 认证相关
│   │   ├── AuthProvider.tsx
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── import/            # 导入向导步骤
│   │   ├── UploadStep.tsx
│   │   ├── ParsePreviewStep.tsx
│   │   ├── StructureValidationStep.tsx
│   │   ├── ConfirmActionsStep.tsx
│   │   └── ImportProgressStep.tsx
│   ├── ui/                # UI 组件库 (Shadcn)
│   └── Layout.tsx
├── pages/
│   ├── RateImport.tsx     # 运价导入
│   ├── ApprovalCenter.tsx # 审核中心
│   ├── RateDiff.tsx       # 差异中心
│   ├── RateHistory.tsx    # 版本历史
│   ├── RateBrowse.tsx     # 运价查询
│   ├── RateCompare.tsx    # 运价对比
│   ├── Vendors.tsx        # 供应商管理
│   ├── Login.tsx
│   └── Signup.tsx
├── services/
│   ├── api.ts             # Mock API (待替换)
│   └── excelParser.ts     # Excel 解析服务
├── store/
│   └── useImportStore.ts  # 导入状态管理
├── integrations/
│   └── supabase/
│       ├── client.ts      # Supabase 客户端
│       └── types.ts       # 数据库类型定义
├── i18n/
│   └── config.ts          # 国际化配置
└── types/
    └── index.ts           # 类型定义
```

### 7.2 状态管理策略
- **全局状态**: Zustand (导入流程状态)
- **服务端状态**: TanStack Query (缓存、重新获取)
- **认证状态**: Context API (AuthProvider)
- **表单状态**: React Hook Form (表单管理)

### 7.3 路由保护
```typescript
// 未实现 - 建议添加
<Route path="/approval" element={
  <ProtectedRoute requiredRole="rate_supervisor">
    <Layout><ApprovalCenter /></Layout>
  </ProtectedRoute>
} />
```

## 8. 部署架构

### 8.1 前端部署
- **平台**: Lovable 托管
- **CDN**: 自动配置
- **域名**: 支持自定义域名 (需付费计划)
- **更新**: 点击 "Update" 按钮发布

### 8.2 后端部署
- **数据库**: Lovable Cloud (Supabase)
- **Edge Functions**: 自动部署
- **实例大小**: 可在设置中调整

### 8.3 环境变量
```
VITE_SUPABASE_URL          # 自动配置
VITE_SUPABASE_PUBLISHABLE_KEY  # 自动配置
VITE_SUPABASE_PROJECT_ID   # 自动配置
```

## 9. 性能优化

### 9.1 前端优化
- **代码分割**: React.lazy + Suspense
- **虚拟滚动**: 大型表格使用虚拟化
- **图片优化**: 按需加载
- **缓存策略**: TanStack Query 缓存配置

### 9.2 数据库优化
- **索引**: 在频繁查询的列上添加索引
  - `vendor_batches.approval_status`
  - `channel_rate_sheets.channel_id`
  - `channel_rate_items.sheet_id`
- **查询优化**: 避免 N+1 查询问题
- **分页**: 所有列表接口使用分页

### 9.3 网络优化
- **批量操作**: 合并多个 API 调用
- **实时更新**: 仅在必要时使用 Realtime
- **压缩**: Gzip/Brotli 压缩

## 10. 监控与日志

### 10.1 错误监控
- 前端: Console errors
- 后端: Edge Function logs

### 10.2 性能监控
- 页面加载时间
- API 响应时间
- 数据库查询性能

### 10.3 日志查看
```
Lovable Cloud → Functions → 选择函数 → Logs
```

## 11. 未来扩展

### 11.1 建议改进
1. **路由保护**: 实现基于角色的路由守卫
2. **实时通知**: 审批结果实时推送
3. **批量导入**: 支持多文件批量上传
4. **高级对比**: 多版本对比、图表可视化
5. **API 文档**: 使用 Swagger 生成 API 文档
6. **单元测试**: Jest + React Testing Library
7. **E2E 测试**: Playwright 或 Cypress
8. **角色管理页面**: Admin 可视化管理用户角色

### 11.2 性能优化
1. **数据库优化**: 添加更多索引
2. **缓存策略**: Redis 缓存热点数据
3. **CDN**: 静态资源 CDN 加速
4. **搜索优化**: 全文搜索 (PostgreSQL FTS)

### 11.3 安全加固
1. **审计日志**: 记录所有敏感操作
2. **IP 白名单**: 限制管理员 IP
3. **API 限流**: 防止 DDoS 攻击
4. **数据加密**: 敏感数据列加密

## 12. 开发指南

### 12.1 本地开发
```bash
npm install
npm run dev
```

### 12.2 数据库迁移
- 使用 Lovable Cloud 自动迁移
- 或使用 SQL 编辑器手动执行

### 12.3 Edge Function 开发
```bash
# 文件位置
supabase/functions/<function-name>/index.ts

# 自动部署 - 无需手动操作
```

### 12.4 代码规范
- TypeScript 严格模式
- ESLint + Prettier
- 组件命名: PascalCase
- 文件命名: kebab-case

---

**文档版本**: 1.0  
**最后更新**: 2025-01  
**维护者**: Lovable AI
