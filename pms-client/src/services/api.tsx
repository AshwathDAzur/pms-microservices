import api from './client';

// Get All Employees
export const getAllEmployees = async() => {
    return api
        .get(`/employee`)
        .then(payload => {
            return payload;
        });
}