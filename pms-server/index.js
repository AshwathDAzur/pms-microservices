import dotenv from 'dotenv';
import express from 'express';
import employeeRouter from './employee.js';
import cors from 'cors';

(async function(){
    dotenv.config();
    const port = process.env.PORT || 3000;
    const app = express();
    app.use(
        cors({
        origin: '*',
        credentials: true,
        })
    );
    const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
    app.use(express.json());
    app.use("/employee", employeeRouter);
})();