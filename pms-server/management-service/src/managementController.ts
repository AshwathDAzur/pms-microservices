import { RequestHandler } from 'express';
import pool from './config/db';
import { logger } from './logger/logger';

export const getProjects: RequestHandler = async (_req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        logger.error({ err: error }, 'getProjects failed');
        next(error);
    }
};

export const getProject: RequestHandler = async (req, res, next) => {
    try {
        const [rows]: any = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params['id']]);
        if (rows.length === 0) {
            res.status(404).json({ message: 'Project not found' });
            return;
        }
        res.json(rows[0]);
    } catch (error) {
        logger.error({ err: error }, 'getProject failed');
        next(error);
    }
};

export const createProject: RequestHandler = async (req, res, next) => {
    try {
        const { name, description, status = 'active', assigned_to, deadline } = req.body;
        if (!name) {
            res.status(400).json({ message: 'name is required' });
            return;
        }
        const [result]: any = await pool.query(
            'INSERT INTO projects (name, description, status, assigned_to, deadline) VALUES (?, ?, ?, ?, ?)',
            [name, description ?? null, status, assigned_to ?? null, deadline ?? null]
        );
        const [rows]: any = await pool.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error({ err: error }, 'createProject failed');
        next(error);
    }
};

export const updateProject: RequestHandler = async (req, res, next) => {
    try {
        const { name, description, status, assigned_to, deadline } = req.body;
        const [existing]: any = await pool.query('SELECT id FROM projects WHERE id = ?', [req.params['id']]);
        if (existing.length === 0) {
            res.status(404).json({ message: 'Project not found' });
            return;
        }
        await pool.query(
            'UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), status = COALESCE(?, status), assigned_to = COALESCE(?, assigned_to), deadline = COALESCE(?, deadline) WHERE id = ?',
            [name ?? null, description ?? null, status ?? null, assigned_to ?? null, deadline ?? null, req.params['id']]
        );
        const [rows]: any = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params['id']]);
        res.json(rows[0]);
    } catch (error) {
        logger.error({ err: error }, 'updateProject failed');
        next(error);
    }
};

export const deleteProject: RequestHandler = async (req, res, next) => {
    try {
        const [existing]: any = await pool.query('SELECT id FROM projects WHERE id = ?', [req.params['id']]);
        if (existing.length === 0) {
            res.status(404).json({ message: 'Project not found' });
            return;
        }
        await pool.query('DELETE FROM projects WHERE id = ?', [req.params['id']]);
        res.status(204).send();
    } catch (error) {
        logger.error({ err: error }, 'deleteProject failed');
        next(error);
    }
};
