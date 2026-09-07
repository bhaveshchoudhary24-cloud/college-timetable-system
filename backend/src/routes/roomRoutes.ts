import { Router } from 'express';
import { getRooms, createRoom, updateRoom, deleteRoom, getLabMappings } from '../controllers/roomController';

const router = Router();

router.get('/', getRooms);
router.get('/lab-mappings', getLabMappings);
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

export default router;
