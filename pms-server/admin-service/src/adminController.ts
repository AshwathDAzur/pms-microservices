import { RequestHandler } from 'express';
import pool from './config/db';
import { logger } from './logger/logger';

export const getEmployees: RequestHandler = async (_req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM employees ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        logger.error({ err: error }, 'getEmployees failed');
        next(error);
    }
};

export const getEmployee: RequestHandler = async (req, res, next) => {
    try {
        const [rows]: any = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params['id']]);
        if (rows.length === 0) {
            res.status(404).json({ message: 'Employee not found' });
            return;
        }
        res.json(rows[0]);
    } catch (error) {
        logger.error({ err: error }, 'getEmployee failed');
        next(error);
    }
};

export const createEmployee: RequestHandler = async (req, res, next) => {
    try {
        const { name, email, role, department, status = 'active' } = req.body;
        if (!name || !email || !role || !department) {
            res.status(400).json({ message: 'name, email, role and department are required' });
            return;
        }
        const [result]: any = await pool.query(
            'INSERT INTO employees (name, email, role, department, status) VALUES (?, ?, ?, ?, ?)',
            [name, email, role, department, status]
        );
        const [rows]: any = await pool.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'An employee with this email already exists' });
            return;
        }
        logger.error({ err: error }, 'createEmployee failed');
        next(error);
    }
};

export const updateEmployee: RequestHandler = async (req, res, next) => {
    try {
        const { name, email, role, department, status } = req.body;
        const [existing]: any = await pool.query('SELECT id FROM employees WHERE id = ?', [req.params['id']]);
        if (existing.length === 0) {
            res.status(404).json({ message: 'Employee not found' });
            return;
        }
        await pool.query(
            'UPDATE employees SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), department = COALESCE(?, department), status = COALESCE(?, status) WHERE id = ?',
            [name ?? null, email ?? null, role ?? null, department ?? null, status ?? null, req.params['id']]
        );
        const [rows]: any = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params['id']]);
        res.json(rows[0]);
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'An employee with this email already exists' });
            return;
        }
        logger.error({ err: error }, 'updateEmployee failed');
        next(error);
    }
};

export const deleteEmployee: RequestHandler = async (req, res, next) => {
    try {
        const [existing]: any = await pool.query('SELECT id FROM employees WHERE id = ?', [req.params['id']]);
        if (existing.length === 0) {
            res.status(404).json({ message: 'Employee not found' });
            return;
        }
        await pool.query('DELETE FROM employees WHERE id = ?', [req.params['id']]);
        res.status(204).send();
    } catch (error) {
        logger.error({ err: error }, 'deleteEmployee failed');
        next(error);
    }
};
