import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: { department: true }
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rooms', error });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { roomNumber, capacity, isLab, departmentId } = req.body;
    const room = await prisma.room.create({
      data: { roomNumber, capacity: parseInt(capacity), isLab, departmentId }
    });
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error creating room', error });
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roomNumber, capacity, isLab, departmentId } = req.body;
    const room = await prisma.room.update({
      where: { id: String(id) },
      data: { roomNumber, capacity: parseInt(capacity), isLab, departmentId }
    });
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error updating room', error });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.room.update({
      where: { id: String(id) },
      data: { isActive: false }
    });
    res.json({ message: 'Room soft-deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting room', error });
  }
};

export const getLabMappings = async (req: Request, res: Response) => {
  try {
    const allowedLocations = await prisma.assignmentAllowedLocation.findMany({
      include: {
        assignment: {
          include: {
            division: { include: { year: true } },
            batch: true,
            subject: true,
            teacher: true
          }
        }
      },
      orderBy: [
        { roomNumber: 'asc' },
        { batchName: 'asc' }
      ]
    });

    const mappings = allowedLocations.map(loc => ({
      id: loc.id,
      roomNumber: loc.roomNumber,
      roomName: loc.roomName,
      isPreferred: loc.isPreferred,
      className: loc.assignment.division?.year?.year === 2 ? 'SE' : (loc.assignment.division?.year?.year === 3 ? 'TE' : 'BE'),
      divisionName: loc.assignment.division?.name,
      batchName: loc.batchName,
      subjectCode: loc.assignment.subject?.code,
      subjectName: loc.assignment.subject?.name,
      teacherName: loc.assignment.teacher?.name,
      type: loc.assignment.type,
      weeklyHours: loc.assignment.weeklyHours
    }));

    res.json(mappings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lab mappings', error });
  }
};


