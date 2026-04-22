import api from './client';

// ── Employee API → BFF → admin-service ───────────────────────
export const getEmployees = () => api.get('/admin');
export const getEmployee = (id: number) => api.get(`/admin/${id}`);
export const createEmployee = (data: EmployeePayload) => api.post('/admin', data);
export const updateEmployee = (id: number, data: Partial<EmployeePayload>) => api.put(`/admin/${id}`, data);
export const deleteEmployee = (id: number) => api.delete(`/admin/${id}`);

// ── Project API → BFF → management-service ───────────────────
export const getProjects = () => api.get('/management');
export const getProject = (id: number) => api.get(`/management/${id}`);
export const createProject = (data: ProjectPayload) => api.post('/management', data);
export const updateProject = (id: number, data: Partial<ProjectPayload>) => api.put(`/management/${id}`, data);
export const deleteProject = (id: number) => api.delete(`/management/${id}`);

// ── Types ─────────────────────────────────────────────────────
export interface Employee {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export type EmployeePayload = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;

export interface Project {
    id: number;
    name: string;
    description: string;
    status: 'active' | 'on-hold' | 'completed';
    assigned_to: string;
    deadline: string;
    created_at: string;
    updated_at: string;
}

export type ProjectPayload = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'assigned_to' | 'deadline'> & {
    assigned_to?: string;
    deadline?: string;
};
