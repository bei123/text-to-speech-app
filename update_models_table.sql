-- 为models表添加series字段
ALTER TABLE models ADD COLUMN series VARCHAR(100) DEFAULT '其他' AFTER label;

-- 更新现有模型数据，设置系列信息
UPDATE models SET series = '标准系列' WHERE value IN ('model1', 'model2');
UPDATE models SET series = '英语系列' WHERE value IN ('model3', 'model4');

-- 添加更多示例模型数据（可选）
-- INSERT INTO models (value, label, series, avatar_url) VALUES
-- ('model5', '男声-粤语', '粤语系列', '/avatars/male3.png'),
-- ('model6', '女声-粤语', '粤语系列', '/avatars/female3.png'),
-- ('model7', '男声-日语', '日语系列', '/avatars/male4.png'),
-- ('model8', '女声-日语', '日语系列', '/avatars/female4.png'); 