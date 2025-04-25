'use client';

import { useState } from 'react';
import { Card, Title, Button } from "@tremor/react";
import { FaBell, FaPills, FaRunning, FaUserMd, FaTrash, FaEdit, FaPlus } from 'react-icons/fa';

// Caretaker type
interface Caretaker {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
}

// Reminder type
interface Reminder {
  id: string;
  type: 'medication' | 'exercise' | 'appointment' | 'other';
  title: string;
  description: string;
  time: string;
  recurring: boolean;
  frequency?: string;
  isActive: boolean;
}

export default function CaretakerManagement() {
  // Sample data - in a real app, this would come from a database
  const [caretakers, setCaretakers] = useState<Caretaker[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      phone: '+1 234-567-8902',
      email: 'sarah.j@email.com',
      relationship: 'Daughter',
    },
    {
      id: '2',
      name: 'Michael Smith',
      phone: '+1 234-567-8903',
      email: 'michael.s@email.com',
      relationship: 'Son',
    },
  ]);

  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: '1',
      type: 'medication',
      title: 'Take Blood Pressure Medication',
      description: 'Take 1 tablet of Lisinopril with water',
      time: '08:00',
      recurring: true,
      frequency: 'daily',
      isActive: true,
    },
    {
      id: '2',
      type: 'exercise',
      title: 'Morning Walk',
      description: 'Go for a 20-minute light walk',
      time: '09:30',
      recurring: true,
      frequency: 'weekdays',
      isActive: true,
    },
    {
      id: '3',
      type: 'appointment',
      title: 'Cardiology Appointment',
      description: 'Dr. Wilson, Heart Center',
      time: '14:00',
      recurring: false,
      isActive: true,
    },
  ]);

  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showAddCaretaker, setShowAddCaretaker] = useState(false);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    type: 'medication',
    title: '',
    description: '',
    time: '',
    recurring: false,
    isActive: true,
  });
  const [newCaretaker, setNewCaretaker] = useState<Partial<Caretaker>>({
    name: '',
    phone: '',
    email: '',
    relationship: '',
  });

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'medication':
        return <FaPills className="text-blue-500" />;
      case 'exercise':
        return <FaRunning className="text-green-500" />;
      case 'appointment':
        return <FaUserMd className="text-red-500" />;
      default:
        return <FaBell className="text-amber-500" />;
    }
  };

  const handleAddReminder = () => {
    if (newReminder.title && newReminder.time) {
      const reminder: Reminder = {
        id: Date.now().toString(),
        type: newReminder.type as 'medication' | 'exercise' | 'appointment' | 'other',
        title: newReminder.title,
        description: newReminder.description || '',
        time: newReminder.time,
        recurring: newReminder.recurring || false,
        frequency: newReminder.frequency,
        isActive: true,
      };
      
      setReminders([...reminders, reminder]);
      setNewReminder({
        type: 'medication',
        title: '',
        description: '',
        time: '',
        recurring: false,
        isActive: true,
      });
      setShowAddReminder(false);
    }
  };

  const handleAddCaretaker = () => {
    if (newCaretaker.name && newCaretaker.phone) {
      const caretaker: Caretaker = {
        id: Date.now().toString(),
        name: newCaretaker.name,
        phone: newCaretaker.phone,
        email: newCaretaker.email || '',
        relationship: newCaretaker.relationship || '',
      };
      
      setCaretakers([...caretakers, caretaker]);
      setNewCaretaker({
        name: '',
        phone: '',
        email: '',
        relationship: '',
      });
      setShowAddCaretaker(false);
    }
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const handleToggleReminderActive = (id: string) => {
    setReminders(reminders.map(r => 
      r.id === id ? { ...r, isActive: !r.isActive } : r
    ));
  };

  const handleDeleteCaretaker = (id: string) => {
    setCaretakers(caretakers.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Caretakers Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Caretakers</h2>
            <Button
              size="sm"
              onClick={() => setShowAddCaretaker(true)}
              icon={FaPlus}
            >
              Add Caretaker
            </Button>
          </div>

          {caretakers.length > 0 ? (
            <div className="space-y-4">
              {caretakers.map((caretaker) => (
                <div key={caretaker.id} className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-lg font-medium">{caretaker.name}</h3>
                      <div className="space-y-1 mt-1 text-sm text-gray-600">
                        <p><span className="font-medium">Phone:</span> {caretaker.phone}</p>
                        <p><span className="font-medium">Relationship:</span> {caretaker.relationship}</p>
                        <p><span className="font-medium">Email:</span> {caretaker.email}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 text-gray-500 hover:text-gray-700">
                        <FaEdit />
                      </button>
                      <button 
                        className="p-2 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteCaretaker(caretaker.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex space-x-3">
                    <button className="px-3 py-1 text-sm bg-red-600 text-white rounded-full hover:bg-red-700">
                      Message
                    </button>
                    <button className="px-3 py-1 text-sm bg-red-600 text-white rounded-full hover:bg-red-700">
                      Call
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">No caretakers added yet.</p>
          )}

          {/* Add Caretaker Form */}
          {showAddCaretaker && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-3">Add New Caretaker</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md"
                    value={newCaretaker.name}
                    onChange={(e) => setNewCaretaker({...newCaretaker, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md"
                    value={newCaretaker.phone}
                    onChange={(e) => setNewCaretaker({...newCaretaker, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full p-2 border rounded-md"
                    value={newCaretaker.email}
                    onChange={(e) => setNewCaretaker({...newCaretaker, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md"
                    value={newCaretaker.relationship}
                    onChange={(e) => setNewCaretaker({...newCaretaker, relationship: e.target.value})}
                  />
                </div>
                <div className="flex space-x-3 justify-end">
                  <button
                    className="px-3 py-1 text-gray-600 hover:text-gray-800"
                    onClick={() => setShowAddCaretaker(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                    onClick={handleAddCaretaker}
                  >
                    Add Caretaker
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reminders Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Health Reminders</h2>
            <Button
              size="sm"
              onClick={() => setShowAddReminder(true)}
              icon={FaPlus}
            >
              Add Reminder
            </Button>
          </div>

          {reminders.length > 0 ? (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <div 
                  key={reminder.id} 
                  className={`border rounded-lg p-4 ${!reminder.isActive ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-gray-100 rounded-full">
                        {getReminderIcon(reminder.type)}
                      </div>
                      <div>
                        <h3 className="font-medium">{reminder.title}</h3>
                        <p className="text-sm text-gray-600">{reminder.description}</p>
                        <div className="flex space-x-2 text-xs text-gray-500 mt-1">
                          <span>{reminder.time}</span>
                          {reminder.recurring && (
                            <span>• {reminder.frequency}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        className={`p-2 ${reminder.isActive ? 'text-green-500' : 'text-gray-400'} hover:text-green-700`}
                        onClick={() => handleToggleReminderActive(reminder.id)}
                        title={reminder.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <FaBell />
                      </button>
                      <button 
                        className="p-2 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteReminder(reminder.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">No reminders set yet.</p>
          )}

          {/* Add Reminder Form */}
          {showAddReminder && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-3">Add New Reminder</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newReminder.type}
                    onChange={(e) => setNewReminder({...newReminder, type: e.target.value as any})}
                  >
                    <option value="medication">Medication</option>
                    <option value="exercise">Exercise</option>
                    <option value="appointment">Appointment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md"
                    value={newReminder.description}
                    onChange={(e) => setNewReminder({...newReminder, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    className="w-full p-2 border rounded-md"
                    value={newReminder.time}
                    onChange={(e) => setNewReminder({...newReminder, time: e.target.value})}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="recurring"
                    className="mr-2"
                    checked={newReminder.recurring}
                    onChange={(e) => setNewReminder({...newReminder, recurring: e.target.checked})}
                  />
                  <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
                    Recurring Reminder
                  </label>
                </div>
                {newReminder.recurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={newReminder.frequency}
                      onChange={(e) => setNewReminder({...newReminder, frequency: e.target.value})}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
                <div className="flex space-x-3 justify-end">
                  <button
                    className="px-3 py-1 text-gray-600 hover:text-gray-800"
                    onClick={() => setShowAddReminder(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                    onClick={handleAddReminder}
                  >
                    Add Reminder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 