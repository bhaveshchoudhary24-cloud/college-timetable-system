"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, DoorOpen, Search, Loader2, FlaskConical, Building2, CheckCircle2, Layers, BookOpen, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [labMappings, setLabMappings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'ALL' | 'CLASSROOM' | 'LAB' | 'MAPPINGS'>('ALL');
  const [mappingClassFilter, setMappingClassFilter] = useState<string>("ALL");
  const [mappingRoomFilter, setMappingRoomFilter] = useState<string>("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState({ id: '', roomNumber: '', capacity: '', isLab: false, labType: '', departmentId: '' });

  const fetchRooms = async () => {
    try {
      const res = await fetch(apiUrl('/api/rooms'));
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLabMappings = async () => {
    try {
      const res = await fetch(apiUrl('/api/rooms/lab-mappings'));
      const data = await res.json();
      if (Array.isArray(data)) setLabMappings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(apiUrl('/api/departments'));
      const data = await res.json();
      setDepartments(data);
      if (data.length > 0) setCurrentRoom(prev => ({ ...prev, departmentId: data[0].id }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([fetchRooms(), fetchLabMappings(), fetchDepartments()]).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;
    try {
      const res = await fetch(apiUrl(`/api/rooms/${id}`), { method: 'DELETE' });
      if (res.ok) fetchRooms();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (isEdit: boolean) => {
    const url = isEdit ? apiUrl(`/api/rooms/${currentRoom.id}`) : apiUrl('/api/rooms');
    const method = isEdit ? 'PUT' : 'POST';
    const payload = { 
      ...currentRoom, 
      capacity: parseInt(currentRoom.capacity as string) 
    };
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchRooms();
        fetchLabMappings();
        setIsAddOpen(false);
        setIsEditOpen(false);
        setCurrentRoom({ id: '', roomNumber: '', capacity: '', isLab: false, labType: '', departmentId: departments[0]?.id || '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRooms = rooms.filter(r => {
    const matchesSearch = r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (r.labType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (r.department?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'CLASSROOM') return matchesSearch && !r.isLab;
    if (activeTab === 'LAB') return matchesSearch && r.isLab;
    return matchesSearch;
  });

  const filteredMappings = labMappings.filter(m => {
    const fullClass = `${m.className}-${m.divisionName}`;
    const matchesClass = mappingClassFilter === 'ALL' || fullClass === mappingClassFilter || m.className === mappingClassFilter;
    const matchesRoom = mappingRoomFilter === 'ALL' || m.roomNumber === mappingRoomFilter;
    const matchesSearch = !searchQuery || 
      m.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.roomName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.subjectCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.teacherName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.batchName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesRoom && matchesSearch;
  });

  const classroomCount = rooms.filter(r => !r.isLab).length;
  const labCount = rooms.filter(r => r.isLab).length;
  const availableRoomsList = [...new Set(labMappings.map(m => m.roomNumber))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="mmit-badge-red">MMIT Infrastructure</span>
            <span className="text-xs font-semibold text-slate-500">Resource & Lab Management</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Classrooms & Specialized Laboratories
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Official department infrastructure, room capacities, and active batch-to-lab scheduling allocations.
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) setCurrentRoom({ id: '', roomNumber: '', capacity: '', isLab: false, labType: '', departmentId: departments[0]?.id || '' }); }}>
          <DialogTrigger asChild>
            <button className="mmit-btn-primary self-start sm:self-auto cursor-pointer" onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add Room / Lab
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-[#990000]" /> Add Infrastructure Room
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Room / Lab Number</label>
                <Input placeholder="e.g. E102 or C101" value={currentRoom.roomNumber} onChange={e => setCurrentRoom({...currentRoom, roomNumber: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Descriptive Name / Lab Type</label>
                <Input placeholder="e.g. Database Management and System Lab" value={currentRoom.labType} onChange={e => setCurrentRoom({...currentRoom, labType: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Seating Capacity</label>
                <Input type="number" placeholder="e.g. 60" value={currentRoom.capacity} onChange={e => setCurrentRoom({...currentRoom, capacity: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <input
                  type="checkbox"
                  id="isLabCheck"
                  checked={currentRoom.isLab}
                  onChange={e => setCurrentRoom({...currentRoom, isLab: e.target.checked})}
                  className="w-4 h-4 accent-[#990000] rounded"
                />
                <label htmlFor="isLabCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Is Specialized Practical Laboratory
                </label>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#990000]"
                  value={currentRoom.departmentId}
                  onChange={e => setCurrentRoom({...currentRoom, departmentId: e.target.value})}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <button className="mmit-btn-primary" onClick={() => handleSave(false)}>Save Room</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#990000]" /> Edit Room / Lab
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Room / Lab Number</label>
                <Input value={currentRoom.roomNumber} onChange={e => setCurrentRoom({...currentRoom, roomNumber: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Descriptive Name / Lab Type</label>
                <Input value={currentRoom.labType} onChange={e => setCurrentRoom({...currentRoom, labType: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Seating Capacity</label>
                <Input type="number" value={currentRoom.capacity} onChange={e => setCurrentRoom({...currentRoom, capacity: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <input
                  type="checkbox"
                  id="isLabCheckEdit"
                  checked={currentRoom.isLab}
                  onChange={e => setCurrentRoom({...currentRoom, isLab: e.target.checked})}
                  className="w-4 h-4 accent-[#990000] rounded"
                />
                <label htmlFor="isLabCheckEdit" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Is Specialized Practical Laboratory
                </label>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#990000]"
                  value={currentRoom.departmentId}
                  onChange={e => setCurrentRoom({...currentRoom, departmentId: e.target.value})}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <button className="mmit-btn-primary" onClick={() => handleSave(true)}>Update Room</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Rooms</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{rooms.length}</p>
          <span className="text-[11px] text-slate-500 font-medium">Department infrastructure</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Classrooms</span>
            <Building2 className="w-4 h-4 text-[#990000]" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{classroomCount}</p>
          <span className="text-[11px] text-slate-500 font-medium">E101 to E106 lecture halls</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Laboratories</span>
            <FlaskConical className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{labCount}</p>
          <span className="text-[11px] text-slate-500 font-medium">C101 to C111 specialized labs</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Batch Lab Mappings</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{labMappings.length}</p>
          <span className="text-[11px] text-emerald-600 font-semibold">100% Assigned in Solver</span>
        </div>
      </div>

      {/* Tabs & Table Container */}
      <div className="mmit-table-container">
        {/* Category Navigation Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${activeTab === 'ALL' ? 'bg-[#990000] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              All Rooms ({rooms.length})
            </button>
            <button
              onClick={() => setActiveTab('CLASSROOM')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'CLASSROOM' ? 'bg-[#990000] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              <Building2 className="w-3.5 h-3.5" /> Classrooms ({classroomCount})
            </button>
            <button
              onClick={() => setActiveTab('LAB')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'LAB' ? 'bg-[#990000] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              <FlaskConical className="w-3.5 h-3.5" /> Laboratories ({labCount})
            </button>
            <button
              onClick={() => setActiveTab('MAPPINGS')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'MAPPINGS' ? 'bg-[#990000] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-500" /> Lab & Batch Allocations ({labMappings.length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab === 'MAPPINGS' && (
              <>
                <select
                  value={mappingClassFilter}
                  onChange={(e) => setMappingClassFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-700 focus:outline-none focus:border-[#990000]"
                >
                  <option value="ALL">All Classes (SE, TE, BE)</option>
                  <option value="SE-A">SE-A</option>
                  <option value="SE-B">SE-B</option>
                  <option value="TE-A">TE-A</option>
                  <option value="TE-B">TE-B</option>
                  <option value="BE-A">BE-A</option>
                  <option value="BE-B">BE-B</option>
                </select>

                <select
                  value={mappingRoomFilter}
                  onChange={(e) => setMappingRoomFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-700 focus:outline-none focus:border-[#990000]"
                >
                  <option value="ALL">All Lab Rooms</option>
                  {availableRoomsList.map(rNum => (
                    <option key={rNum} value={rNum}>{rNum}</option>
                  ))}
                </select>
              </>
            )}

            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'MAPPINGS' ? "Search subject, teacher, batch..." : "Search room number / lab..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#990000]"
              />
            </div>
          </div>
        </div>

        {/* View 1: Main Room Master Table */}
        {activeTab !== 'MAPPINGS' ? (
          <table className="mmit-table">
            <thead>
              <tr>
                <th>Room Code</th>
                <th>Descriptive Name / Specialized Lab</th>
                <th>Resource Type</th>
                <th>Capacity</th>
                <th>Primary Role & Allocation</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#990000]" />
                    Loading rooms...
                  </td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <DoorOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    No rooms found in category.
                  </td>
                </tr>
              ) : filteredRooms.map((room) => {
                let assignedRole = 'Eligible for Batch Practicals';
                if (room.roomNumber === 'E101') assignedRole = 'SE-A Dedicated Theory Room';
                else if (room.roomNumber === 'E104') assignedRole = 'SE-B Dedicated Theory Room';
                else if (room.roomNumber === 'E102') assignedRole = 'TE-A Dedicated Theory Room';
                else if (room.roomNumber === 'E103') assignedRole = 'TE-B Dedicated Theory Room';
                else if (room.roomNumber === 'E105' || room.roomNumber === 'E106') assignedRole = 'BE / Seminar Hall';

                return (
                  <tr key={room.id}>
                    <td>
                      <span className="mmit-badge-red font-mono font-bold text-sm">{room.roomNumber}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-900 text-sm">{room.labType || (room.isLab ? 'Computer Laboratory' : 'Lecture Hall')}</span>
                    </td>
                    <td>
                      {room.isLab ? (
                        <span className="mmit-badge-amber flex items-center gap-1 w-fit">
                          <FlaskConical className="w-3 h-3" /> Laboratory
                        </span>
                      ) : (
                        <span className="mmit-badge-blue flex items-center gap-1 w-fit">
                          <Building2 className="w-3 h-3" /> Lecture Hall
                        </span>
                      )}
                    </td>
                    <td className="font-semibold text-slate-700">{room.capacity} Students</td>
                    <td>
                      <span className="mmit-badge-gray text-xs font-semibold">{assignedRole}</span>
                    </td>
                    <td>
                      <span className="mmit-badge-emerald flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    </td>
                    <td className="text-right space-x-1">
                      <button
                        onClick={() => {
                          setCurrentRoom({ id: room.id, roomNumber: room.roomNumber, capacity: room.capacity, isLab: room.isLab, labType: room.labType || '', departmentId: room.departmentId });
                          setIsEditOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Edit Room"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(room.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* View 2: Detailed Lab & Batch Allocations Matrix */
          <table className="mmit-table">
            <thead>
              <tr>
                <th>Lab / Room</th>
                <th>Lab Descriptive Name</th>
                <th>Class & Div</th>
                <th>Batch</th>
                <th>Subject & Course Code</th>
                <th>Assigned Faculty</th>
                <th>Type & Load</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#990000]" />
                    Loading lab mappings...
                  </td>
                </tr>
              ) : filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    No matching lab allocations found.
                  </td>
                </tr>
              ) : filteredMappings.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="mmit-badge-red font-mono font-bold text-xs">{m.roomNumber}</span>
                  </td>
                  <td>
                    <span className="font-semibold text-slate-900 text-xs">{m.roomName || m.roomNumber}</span>
                  </td>
                  <td>
                    <span className="mmit-badge-blue font-bold text-xs">{m.className}-{m.divisionName}</span>
                  </td>
                  <td>
                    <span className="mmit-badge-amber font-mono font-bold text-xs">{m.batchName}</span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-900">{m.subjectCode}</span>
                      <span className="text-[11px] text-slate-500">{m.subjectName}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{m.teacherName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="mmit-badge-emerald text-xs">
                      {m.type} ({m.weeklyHours}h)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
