-- 清空現有資料
DELETE FROM assets;

-- 重置序列
ALTER SEQUENCE assets_id_seq RESTART WITH 1;

-- 插入測試資料
WITH RECURSIVE dates AS (
  SELECT 
    '2025-01-01'::date + (random() * 364)::integer AS tracking_date,
    CASE 
      WHEN random() < 0.3 THEN 'pending'
      WHEN random() < 0.6 THEN 'in_progress'
      ELSE 'completed'
    END AS status,
    'AST-' || LPAD(floor(random() * 100000)::text, 6, '0') AS asset_number,
    (
      CASE floor(random() * 5)::integer
        WHEN 0 THEN 'Dell Latitude 5420 筆電'
        WHEN 1 THEN 'HP ProDesk 600 G6 電腦'
        WHEN 2 THEN 'Lenovo ThinkCentre M70q 電腦'
        WHEN 3 THEN 'ASUS ProArt PA278CV 螢幕'
        WHEN 4 THEN 'Brother MFC-L9570CDW 印表機'
      END
    ) AS name,
    CASE 
      WHEN random() < 0.7 THEN 'admin'
      ELSE 'manager'
    END AS completed_by,
    generate_series(1, 250) AS id
),
processed_dates AS (
  SELECT 
    id,
    tracking_date,
    status,
    asset_number,
    name,
    CASE 
      WHEN status = 'completed' THEN 
        (tracking_date + (random() * 14)::integer)::timestamp at time zone 'UTC'
      ELSE NULL
    END AS completion_date,
    CASE 
      WHEN status = 'completed' THEN completed_by
      ELSE NULL
    END AS completed_by
  FROM dates
)
INSERT INTO assets (
  id,
  asset_number,
  name,
  tracking_date,
  status,
  completion_date,
  completed_by,
  created_at,
  updated_at
)
SELECT
  id,
  asset_number,
  name,
  tracking_date,
  status,
  completion_date,
  completed_by,
  tracking_date::timestamp at time zone 'UTC' as created_at,
  COALESCE(completion_date, tracking_date::timestamp at time zone 'UTC') as updated_at
FROM processed_dates; 