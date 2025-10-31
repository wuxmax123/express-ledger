# 数据库表结构文档 / Database Schema Documentation

## 概述 / Overview

本文档描述了运费管理系统的完整数据库表结构设计。系统采用关系型数据库，主要用于管理物流商、渠道、运费版本和价格对比。

This document describes the complete database schema design for the freight management system. The system uses a relational database to manage vendors, channels, rate versions, and price comparisons.

---

## 核心表 / Core Tables

### 1. vendors (物流商表)

物流商基础信息表，存储所有合作的物流供应商。

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | 自增主键 |
| name | VARCHAR(255) NOT NULL | 物流商名称，如"YunExpress" |
| code | VARCHAR(50) UNIQUE NOT NULL | 物流商代码，用于系统标识 |
| contact_info | TEXT | 联系方式（JSON或文本） |
| created_at | TIMESTAMP DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP DEFAULT NOW() | 更新时间 |

**索引 / Indexes:**
- `idx_vendors_code` ON (code)

**示例数据 / Sample Data:**
```sql
INSERT INTO vendors (name, code, contact_info) VALUES
('YunExpress', 'YUNEXPRESS', '{"email": "service@yunexpress.com"}'),
('Sunyou', 'SUNYOU', '{"email": "service@sunyou.com"}');
```

---

### 2. shipping_channels (物流渠道表)

物流渠道信息，每个物流商可以有多个渠道。

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | 自增主键 |
| vendor_id | INTEGER REFERENCES vendors(id) | 所属物流商ID |
| name | VARCHAR(255) NOT NULL | 渠道名称 |
| channel_code | VARCHAR(100) UNIQUE NOT NULL | 渠道代码 |
| currency | VARCHAR(10) DEFAULT 'USD' | 币种（USD, CNY等） |
| region | VARCHAR(100) | 服务区域（如"欧洲", "美国"） |
| service_type | VARCHAR(50) | 服务类型（如"专线", "挂号"） |
| created_at | TIMESTAMP DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP DEFAULT NOW() | 更新时间 |

**索引 / Indexes:**
- `idx_channels_vendor` ON (vendor_id)
- `idx_channels_code` ON (channel_code)

**外键约束 / Foreign Keys:**
- `fk_channel_vendor` FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE

---

### 3. vendor_batches (上传批次表) ⭐ 新增

记录每次物流商运费文件的上传批次，用于版本历史追踪。

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | 自增主键 |
| vendor_id | INTEGER REFERENCES vendors(id) | 所属物流商ID |
| file_name | VARCHAR(255) NOT NULL | 上传的Excel文件名 |
| uploaded_by | VARCHAR(100) NOT NULL | 上传人用户名 |
| uploaded_at | TIMESTAMP DEFAULT NOW() | 上传时间 |
| effective_date | DATE | 生效日期（从Excel解析或手动设置） |
| total_channels | INTEGER DEFAULT 0 | 本次更新的渠道数量 |
| notes | TEXT | 备注信息（从Excel脚注提取或手动输入） |

**索引 / Indexes:**
- `idx_batches_vendor` ON (vendor_id)
- `idx_batches_uploaded_at` ON (uploaded_at DESC)

**外键约束 / Foreign Keys:**
- `fk_batch_vendor` FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE

---

### 4. channel_rate_sheets (渠道运费版本表)

存储每个渠道的运费版本记录，关联到上传批次。

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | 自增主键 |
| channel_id | INTEGER REFERENCES shipping_channels(id) | 所属渠道ID |
| batch_id | INTEGER REFERENCES vendor_batches(id) | 所属批次ID ⭐ 新增 |
| version_code | VARCHAR(50) NOT NULL | 版本号（如"v20251020"） |
| effective_date | DATE NOT NULL | 生效日期 |
| file_name | VARCHAR(255) | 原始文件名（可与batch重复） |
| uploaded_by | VARCHAR(100) NOT NULL | 上传人 |
| status | VARCHAR(20) DEFAULT 'active' | 状态：active/inactive |
| created_at | TIMESTAMP DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP DEFAULT NOW() | 更新时间 |

**索引 / Indexes:**
- `idx_sheets_channel` ON (channel_id)
- `idx_sheets_batch` ON (batch_id)
- `idx_sheets_effective_date` ON (effective_date DESC)
- `idx_sheets_status` ON (status)

**外键约束 / Foreign Keys:**
- `fk_sheet_channel` FOREIGN KEY (channel_id) REFERENCES shipping_channels(id) ON DELETE CASCADE
- `fk_sheet_batch` FOREIGN KEY (batch_id) REFERENCES vendor_batches(id) ON DELETE SET NULL

**唯一约束 / Unique Constraints:**
- `uk_channel_version` UNIQUE (channel_id, version_code)

---

### 5. channel_rate_items (运费明细表)

存储运费表的具体价格明细（国家、重量段、价格等）。

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | 自增主键 |
| sheet_id | INTEGER REFERENCES channel_rate_sheets(id) | 所属版本ID |
| country | VARCHAR(100) NOT NULL | 国家代码或名称 |
| zone | VARCHAR(50) | 区域（如果有分区） |
| weight_from | DECIMAL(10,3) NOT NULL | 起始重量（kg） |
| weight_to | DECIMAL(10,3) NOT NULL | 结束重量（kg） |
| price | DECIMAL(10,2) NOT NULL | 单价 |
| currency | VARCHAR(10) DEFAULT 'USD' | 币种 |
| eta | VARCHAR(50) | 预计时效（如"7-10天"） |
| created_at | TIMESTAMP DEFAULT NOW() | 创建时间 |

**索引 / Indexes:**
- `idx_items_sheet` ON (sheet_id)
- `idx_items_country` ON (country)
- `idx_items_weight` ON (weight_from, weight_to)

**外键约束 / Foreign Keys:**
- `fk_item_sheet` FOREIGN KEY (sheet_id) REFERENCES channel_rate_sheets(id) ON DELETE CASCADE

---

## 导入相关表 / Import Related Tables

### 6. import_jobs (导入任务表)

记录每次Excel导入的任务状态。

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | 自增主键 |
| vendor_id | INTEGER REFERENCES vendors(id) | 物流商ID |
| file_name | VARCHAR(255) NOT NULL | 文件名 |
| file_url | TEXT | 文件存储URL（可选） |
| started_at | TIMESTAMP DEFAULT NOW() | 开始时间 |
| finished_at | TIMESTAMP | 完成时间 |
| status | VARCHAR(20) NOT NULL | 状态：PENDING/VALIDATING/NEED_CONFIRM/READY/FAILED/SUCCESS |
| uploaded_by | VARCHAR(100) NOT NULL | 上传人 |
| message | TEXT | 错误或提示信息 |

**索引 / Indexes:**
- `idx_jobs_vendor` ON (vendor_id)
- `idx_jobs_status` ON (status)
- `idx_jobs_started_at` ON (started_at DESC)

---

### 7. import_sheets (导入Sheet表)

导入任务中的每个Excel Sheet的解析结果。

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | 自增主键 |
| job_id | INTEGER REFERENCES import_jobs(id) | 所属任务ID |
| sheet_name | VARCHAR(255) NOT NULL | Sheet名称 |
| sheet_type | VARCHAR(20) NOT NULL | 类型：RATE_CARD/FUEL/REMOTE/OTHER |
| parsed_rows | INTEGER DEFAULT 0 | 解析行数 |
| validate_errors | TEXT | 验证错误信息（JSON） |
| structure_change_level | VARCHAR(10) DEFAULT 'NONE' | 结构变化：NONE/MINOR/MAJOR |
| structure_change_message | TEXT | 结构变化说明 |
| channel_code | VARCHAR(100) | 识别出的渠道代码 |

**索引 / Indexes:**
- `idx_import_sheets_job` ON (job_id)

**外键约束 / Foreign Keys:**
- `fk_import_sheet_job` FOREIGN KEY (job_id) REFERENCES import_jobs(id) ON DELETE CASCADE

---

### 8. import_items (导入明细预览表)

导入任务中解析出的待确认数据。

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | 自增主键 |
| sheet_id | INTEGER REFERENCES import_sheets(id) | 所属Sheet ID |
| channel_code | VARCHAR(100) NOT NULL | 渠道代码 |
| country | VARCHAR(100) NOT NULL | 国家 |
| zone | VARCHAR(50) | 区域 |
| weight_from | DECIMAL(10,3) NOT NULL | 起始重量 |
| weight_to | DECIMAL(10,3) NOT NULL | 结束重量 |
| price | DECIMAL(10,2) NOT NULL | 价格 |
| currency | VARCHAR(10) DEFAULT 'USD' | 币种 |
| eta | VARCHAR(50) | 时效 |

**索引 / Indexes:**
- `idx_import_items_sheet` ON (sheet_id)

**外键约束 / Foreign Keys:**
- `fk_import_item_sheet` FOREIGN KEY (sheet_id) REFERENCES import_sheets(id) ON DELETE CASCADE

---

## 对比分析表 / Comparison Tables

### 9. rate_diffs (运费差异表)

存储两个版本之间的价格差异对比结果。

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | 自增主键 |
| old_sheet_id | INTEGER REFERENCES channel_rate_sheets(id) | 旧版本ID |
| new_sheet_id | INTEGER REFERENCES channel_rate_sheets(id) | 新版本ID |
| channel_id | INTEGER REFERENCES shipping_channels(id) | 渠道ID |
| country | VARCHAR(100) NOT NULL | 国家 |
| zone | VARCHAR(50) | 区域 |
| weight_from | DECIMAL(10,3) NOT NULL | 起始重量 |
| weight_to | DECIMAL(10,3) NOT NULL | 结束重量 |
| old_price | DECIMAL(10,2) NOT NULL | 旧价格 |
| new_price | DECIMAL(10,2) NOT NULL | 新价格 |
| delta | DECIMAL(10,2) NOT NULL | 差额（new - old） |
| delta_pct | DECIMAL(10,2) NOT NULL | 变化百分比 |
| created_at | TIMESTAMP DEFAULT NOW() | 创建时间 |

**索引 / Indexes:**
- `idx_diffs_old_sheet` ON (old_sheet_id)
- `idx_diffs_new_sheet` ON (new_sheet_id)
- `idx_diffs_channel` ON (channel_id)
- `idx_diffs_country` ON (country)

**外键约束 / Foreign Keys:**
- `fk_diff_old_sheet` FOREIGN KEY (old_sheet_id) REFERENCES channel_rate_sheets(id) ON DELETE CASCADE
- `fk_diff_new_sheet` FOREIGN KEY (new_sheet_id) REFERENCES channel_rate_sheets(id) ON DELETE CASCADE
- `fk_diff_channel` FOREIGN KEY (channel_id) REFERENCES shipping_channels(id) ON DELETE CASCADE

---

## 关系图 / Entity Relationship Diagram

```
vendors (物流商)
   |
   ├──> shipping_channels (渠道)
   |         |
   |         └──> channel_rate_sheets (运费版本)
   |                   |
   |                   └──> channel_rate_items (运费明细)
   |
   └──> vendor_batches (上传批次) ⭐
             |
             └──> channel_rate_sheets (关联版本)

import_jobs (导入任务)
   |
   └──> import_sheets (Sheet解析)
             |
             └──> import_items (明细预览)

channel_rate_sheets (旧版本) ──┐
                                ├──> rate_diffs (价格对比)
channel_rate_sheets (新版本) ──┘
```

---

## 数据流程 / Data Flow

### 导入流程 / Import Flow

1. **上传文件** → 创建 `import_job` (status=PENDING)
2. **解析Excel** → 创建多个 `import_sheets` + `import_items`
3. **结构验证** → 更新 `structure_change_level` 和 `validate_errors`
4. **用户确认** → status=READY
5. **正式导入** → 
   - 创建 `vendor_batch` (记录本次上传)
   - 为每个渠道创建 `channel_rate_sheet` (关联 batch_id)
   - 批量插入 `channel_rate_items`
   - 更新 `import_job` status=SUCCESS
   - 更新 `vendor_batch.total_channels`

### 版本历史流程 / Version History Flow

1. **按物流商查询** → 查询 `vendor_batches` (vendor_id=?)
2. **展开批次** → 查询 `channel_rate_sheets` (batch_id=?)
3. **按渠道查询** → 查询 `channel_rate_sheets` (channel_id IN (...))

### 差异对比流程 / Diff Comparison Flow

1. 选择渠道和两个版本 → 获取 `old_sheet_id` 和 `new_sheet_id`
2. 计算差异 → 比对 `channel_rate_items`
3. 插入 `rate_diffs` 记录
4. 前端展示 + 生成公告

---

## SQL示例 / SQL Examples

### 创建物流商和渠道

```sql
-- 创建物流商
INSERT INTO vendors (name, code, contact_info)
VALUES ('YunExpress', 'YUNEXPRESS', '{"email": "service@yunexpress.com"}')
RETURNING id;

-- 创建渠道
INSERT INTO shipping_channels (vendor_id, name, channel_code, currency, region, service_type)
VALUES (1, '云途全球专线挂号(带电)', 'YUN_GLOBAL_REG_BATTERY', 'USD', '全球', '挂号');
```

### 查询物流商的所有批次历史

```sql
SELECT 
  vb.id,
  vb.file_name,
  vb.uploaded_by,
  vb.uploaded_at,
  vb.effective_date,
  vb.total_channels,
  vb.notes
FROM vendor_batches vb
WHERE vb.vendor_id = 1
ORDER BY vb.uploaded_at DESC;
```

### 查询某个批次下的所有渠道版本

```sql
SELECT 
  crs.id,
  sc.name AS channel_name,
  crs.version_code,
  crs.effective_date,
  crs.status
FROM channel_rate_sheets crs
JOIN shipping_channels sc ON crs.channel_id = sc.id
WHERE crs.batch_id = 5
ORDER BY sc.name;
```

### 查询某渠道的价格变化趋势

```sql
SELECT 
  crs.version_code,
  crs.effective_date,
  AVG(cri.price) AS avg_price,
  COUNT(*) AS item_count
FROM channel_rate_sheets crs
JOIN channel_rate_items cri ON crs.id = cri.sheet_id
WHERE crs.channel_id = 10
  AND crs.status = 'active'
GROUP BY crs.id, crs.version_code, crs.effective_date
ORDER BY crs.effective_date DESC;
```

### 计算两个版本的差异

```sql
WITH old_prices AS (
  SELECT country, zone, weight_from, weight_to, price
  FROM channel_rate_items
  WHERE sheet_id = 100
),
new_prices AS (
  SELECT country, zone, weight_from, weight_to, price
  FROM channel_rate_items
  WHERE sheet_id = 101
)
SELECT 
  COALESCE(o.country, n.country) AS country,
  COALESCE(o.zone, n.zone) AS zone,
  COALESCE(o.weight_from, n.weight_from) AS weight_from,
  COALESCE(o.weight_to, n.weight_to) AS weight_to,
  o.price AS old_price,
  n.price AS new_price,
  (n.price - o.price) AS delta,
  ROUND((n.price - o.price) / o.price * 100, 2) AS delta_pct
FROM old_prices o
FULL OUTER JOIN new_prices n
  ON o.country = n.country
  AND o.zone = n.zone
  AND o.weight_from = n.weight_from
  AND o.weight_to = n.weight_to
WHERE o.price IS NULL OR n.price IS NULL OR o.price != n.price;
```

---

## 维护建议 / Maintenance Recommendations

### 数据清理 / Data Cleanup

1. **定期归档旧版本**：将 `status='inactive'` 且超过1年的 `channel_rate_sheets` 归档
2. **清理导入记录**：保留最近30天的 `import_jobs` 和相关表
3. **差异表清理**：`rate_diffs` 可定期删除或归档

### 性能优化 / Performance Optimization

1. **分区表**：对于 `channel_rate_items` 和 `rate_diffs`，可按时间分区
2. **索引优化**：根据查询热点添加复合索引
3. **缓存策略**：频繁查询的渠道列表、版本列表使用Redis缓存

### 备份策略 / Backup Strategy

- 每日全量备份 `vendors`, `shipping_channels`, `vendor_batches`, `channel_rate_sheets`
- 增量备份 `channel_rate_items` (按天)
- 导入表可不备份（临时数据）

---

**文档版本 / Document Version:** v1.0  
**最后更新 / Last Updated:** 2025-10-31  
**维护人 / Maintainer:** System Team
