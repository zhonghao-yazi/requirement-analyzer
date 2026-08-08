-- 测试管理系统 — 数据库初始化脚本
-- 使用方法: mysql -u root -proot test_management < init_db.sql

USE test_management;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'engineer', 'viewer') DEFAULT 'engineer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 项目表
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    owner_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_projects_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 需求表
CREATE TABLE IF NOT EXISTS requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(20),
    version INT DEFAULT 1,
    analysis_result JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_req_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 测试用例表
CREATE TABLE IF NOT EXISTS test_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    requirement_id INT,
    category VARCHAR(50) NOT NULL,
    priority ENUM('P0', 'P1', 'P2', 'P3') DEFAULT 'P2',
    status ENUM('draft', 'reviewing', 'approved', 'deprecated') DEFAULT 'draft',
    title VARCHAR(500) NOT NULL,
    preconditions TEXT,
    steps TEXT,
    expected TEXT,
    sort_order INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tc_project (project_id),
    INDEX idx_tc_category (category),
    INDEX idx_tc_priority (priority),
    INDEX idx_tc_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 测试计划表
CREATE TABLE IF NOT EXISTS test_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('draft', 'active', 'completed', 'archived') DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tp_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 计划-用例关联表
CREATE TABLE IF NOT EXISTS plan_testcases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    testcase_id INT NOT NULL,
    assigned_to INT,
    FOREIGN KEY (plan_id) REFERENCES test_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (testcase_id) REFERENCES test_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_plan_tc (plan_id, testcase_id),
    INDEX idx_pt_plan (plan_id),
    INDEX idx_pt_tc (testcase_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 测试执行轮次表
CREATE TABLE IF NOT EXISTS test_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    status ENUM('pending', 'running', 'completed') DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES test_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tr_plan (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 执行记录表（每条用例在每轮中的执行结果）
CREATE TABLE IF NOT EXISTS executions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    testcase_id INT NOT NULL,
    run_id INT NOT NULL,
    status ENUM('untested', 'passed', 'failed', 'blocked', 'skipped') DEFAULT 'untested',
    actual_result TEXT,
    notes TEXT,
    executed_by INT,
    executed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (testcase_id) REFERENCES test_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_exec (testcase_id, run_id),
    INDEX idx_exec_run (run_id),
    INDEX idx_exec_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 缺陷表
CREATE TABLE IF NOT EXISTS defects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    testcase_id INT,
    execution_id INT,
    title VARCHAR(500) NOT NULL,
    severity ENUM('critical', 'major', 'minor', 'trivial') DEFAULT 'major',
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    description TEXT,
    external_id VARCHAR(100),
    external_url VARCHAR(500),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (testcase_id) REFERENCES test_cases(id) ON DELETE SET NULL,
    FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_defect_status (status),
    INDEX idx_defect_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
