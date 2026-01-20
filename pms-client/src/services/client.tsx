import axios from 'axios';
import keycloak from '../keycloak';

const API_URL = import.meta.env.VITE_API_URL;

const Client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-type': 'application/json'
    }
});

Client.interceptors.request.use(
    async config => {
        // Ensure token is fresh (refresh if needed)
        if (keycloak.authenticated) {
            await keycloak.updateToken(30); // refresh if expires in 30s
            config.headers.Authorization = `Bearer ${keycloak.token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

Client.interceptors.response.use(
    // unwrap response data
    ({ data }) => data,
    // catch statusCode != 200 responses and format error
    error => {
        if (error?.response) {
            const errorData = {
                ...error.response.data,
                status: error.response.status
            };
            return Promise.reject(errorData);
        }
        return Promise.reject(error);
    }
);

export default Client;
