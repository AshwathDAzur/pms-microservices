import express from 'express';
import { getProjects, getProject, createProject, updateProject, deleteProject } from './managementController';

const managementRouter = express.Router();

managementRouter.get('/', getProjects);
managementRouter.get('/:id', getProject);
managementRouter.post('/', createProject);
managementRouter.put('/:id', updateProject);
managementRouter.delete('/:id', deleteProject);

export default managementRouter;
