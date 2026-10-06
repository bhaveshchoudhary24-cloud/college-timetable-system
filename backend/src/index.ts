import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes';
import departmentRoutes from './routes/departmentRoutes';
import teacherRoutes from './routes/teacherRoutes';
import subjectRoutes from './routes/subjectRoutes';
import roomRoutes from './routes/roomRoutes';
import timetableRoutes from './routes/timetableRoutes';
import statsRoutes from './routes/statsRoutes';
import divisionRoutes from './routes/divisionRoutes';
import allocationsRoutes from './routes/allocationsRoutes';
import masterSubjectRoutes from './routes/masterSubjectRoutes';
import settingsRoutes from './routes/settingsRoutes';
import publicRoutes from './routes/publicRoutes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(helmet());
app.use(express.json());

const PORT = Number(process.env.PORT) || 5050;

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/divisions', divisionRoutes);
app.use('/api/allocations', allocationsRoutes);
app.use('/api/master-subjects', masterSubjectRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public', publicRoutes);

// Setup generic error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
