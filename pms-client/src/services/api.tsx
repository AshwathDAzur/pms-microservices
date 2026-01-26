import api from './client';

// Get All Employees
export const getAllEmployees = async() => {
    return api
        .get(`/admin`)
        .then(payload => {
            return payload;
        });
}