CREATE DATABASE IF NOT EXISTS pms_db;
USE pms_db;

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    role VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status ENUM('active', 'on-hold', 'completed') NOT NULL DEFAULT 'active',
    assigned_to VARCHAR(150),
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO employees (name, email, role, department, status) VALUES
('Ashwath Kumaran', 'ashwath.kumaran@psiog.com', 'Engineering Manager', 'Engineering', 'active'),
('Priya Sharma', 'priya.sharma@psiog.com', 'Senior Developer', 'Engineering', 'active'),
('Rahul Mehta', 'rahul.mehta@psiog.com', 'QA Engineer', 'Quality Assurance', 'active'),
('Divya Nair', 'divya.nair@psiog.com', 'UI/UX Designer', 'Design', 'active'),
('Karthik Raj', 'karthik.raj@psiog.com', 'DevOps Engineer', 'Infrastructure', 'inactive');

INSERT INTO projects (name, description, status, assigned_to, deadline) VALUES
('PMS Microservices', 'Project Management System built with microservices architecture', 'active', 'ashwath.kumaran@psiog.com', '2026-12-31'),
('Auth Module Upgrade', 'Upgrade Keycloak from 24 to 26 and migrate realm config', 'completed', 'priya.sharma@psiog.com', '2026-03-15'),
('CI/CD Pipeline', 'Set up GitHub Actions pipeline for all microservices', 'on-hold', 'karthik.raj@psiog.com', '2026-06-30'),
('Mobile App MVP', 'React Native mobile app for project tracking', 'active', 'divya.nair@psiog.com', '2026-09-01'),
('Load Testing Suite', 'Implement k6 load tests for all API endpoints', 'on-hold', 'rahul.mehta@psiog.com', '2026-07-15');
