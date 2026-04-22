import axios from 'axios';

const BFF_URL = import.meta.env.VITE_API_URL as string; // /bff

const Client = axios.create({
    baseURL: BFF_URL,
    headers: {
        'Content-type': 'application/json',
    },
    // withCredentials sends the HttpOnly pms_session cookie on every request.
    // The BFF reads it, looks up Redis, and adds the Bearer token before
    // forwarding to the backend service — the token never reaches the browser.
    withCredentials: true,
});

Client.interceptors.response.use(
    ({ data }) => data,
    (error) => {
        if (error?.response?.status === 401) {
            // Session expired — BFF will redirect to Keycloak on next /session poll
            window.location.href = `${BFF_URL}/login`;
            return new Promise(() => {}); // hang the promise; redirect is in flight
        }
        if (error?.response) {
            const errorData = {
                ...error.response.data,
                status: error.response.status,
            };
            return Promise.reject(errorData);
        }
        return Promise.reject(error);
    }
);

export default Client;
