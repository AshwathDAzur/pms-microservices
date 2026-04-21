import express from 'express';
import { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } from './adminController';

const adminRouter = express.Router();

adminRouter.get('/', getEmployees);
adminRouter.get('/:id', getEmployee);
adminRouter.post('/', createEmployee);
adminRouter.put('/:id', updateEmployee);
adminRouter.delete('/:id', deleteEmployee);

export default adminRouter;
